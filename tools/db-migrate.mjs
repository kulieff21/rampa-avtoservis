// Applies db/migrations/*.sql to the database in DATABASE_URL (Neon in production).
// Same rule as src/lib/db.ts migrate(): each file once, in name order, recorded in
// schema_migrations. Local development needs no setup: PGlite migrates itself.
//   DATABASE_URL=postgres://... node tools/db-migrate.mjs
import postgres from "postgres";
import { readdirSync, readFileSync } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = postgres(url, { max: 1 });
await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY)`;
const done = new Set((await sql`SELECT name FROM schema_migrations`).map((r) => r.name));
for (const file of readdirSync("db/migrations").filter((f) => f.endsWith(".sql")).sort()) {
  if (done.has(file)) continue;
  await sql.begin(async (tx) => {
    await tx.unsafe(readFileSync(`db/migrations/${file}`, "utf8"));
    await tx`INSERT INTO schema_migrations (name) VALUES (${file})`;
  });
  console.log("applied", file);
}
await sql.end();
console.log("done");
