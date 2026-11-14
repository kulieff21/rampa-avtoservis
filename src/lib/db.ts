// One tiny interface over two Postgres drivers:
//   - DATABASE_URL set   -> real Postgres (Neon in production) through postgres.js
//   - DATABASE_URL unset -> PGlite, Postgres compiled to WebAssembly, stored in .data/
// Both speak the same SQL, so the rest of the app never knows which one it talks to.

import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type Row = Record<string, unknown>;

export interface Db {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
}

export class DbError extends Error {
  constructor(
    message: string,
    public code: string | undefined,
    public constraint: string | undefined,
  ) {
    super(message);
  }
}

// Postgres error codes we react to.
export const PG_EXCLUSION_VIOLATION = "23P01";
export const PG_UNIQUE_VIOLATION = "23505";

function wrap(err: unknown): DbError {
  const e = err as { message?: string; code?: string; constraint?: string; constraint_name?: string };
  return new DbError(e.message ?? String(err), e.code, e.constraint ?? e.constraint_name);
}

async function createPostgres(url: string): Promise<Db> {
  const { default: postgres } = await import("postgres");
  const sql = postgres(url, { max: 5, prepare: false });
  return {
    async query<T>(text: string, params: unknown[] = []) {
      try {
        return (await sql.unsafe(text, params as never[])) as unknown as T[];
      } catch (err) {
        throw wrap(err);
      }
    },
  };
}

export async function createPglite(dataDir?: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { btree_gist } = await import("@electric-sql/pglite/contrib/btree_gist");
  if (dataDir) await mkdir(path.dirname(dataDir), { recursive: true });
  const pg = await PGlite.create({ dataDir, extensions: { btree_gist } });
  const db: Db = {
    async query<T>(text: string, params: unknown[] = []) {
      try {
        // A statement without parameters may contain several commands (migrations).
        if (params.length === 0 && text.includes(";")) {
          const results = await pg.exec(text);
          return (results.at(-1)?.rows ?? []) as T[];
        }
        return (await pg.query<T>(text, params)).rows;
      } catch (err) {
        throw wrap(err);
      }
    },
  };
  await migrate(db);
  return db;
}

/** Applies every db/migrations/*.sql file that has not run yet, in name order. */
export async function migrate(db: Db) {
  // A fixed folder (not a parameter) so the bundler only ships db/migrations.
  await db.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY)");
  const done = new Set(
    (await db.query<{ name: string }>("SELECT name FROM schema_migrations")).map((r) => r.name),
  );
  const files = (await readdir(path.join(process.cwd(), "db", "migrations")))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await readFile(path.join(process.cwd(), "db", "migrations", file), "utf8");
    await db.query(`${sql}\n;INSERT INTO schema_migrations (name) VALUES ('${file}');`);
  }
}

// Next.js reloads modules in development; keeping the connection on globalThis
// stops every edit from opening a new database.
const globalForDb = globalThis as unknown as { rampaDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalForDb.rampaDb) {
    const url = process.env.DATABASE_URL;
    globalForDb.rampaDb = (
      url ? createPostgres(url) : createPglite(path.join(process.cwd(), ".data", "pglite"))
    ).catch((err) => {
      globalForDb.rampaDb = undefined; // do not remember a failed start; retry next time
      throw err;
    });
  }
  return globalForDb.rampaDb;
}
