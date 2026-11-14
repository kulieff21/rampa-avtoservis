// Everything that reads or writes bookings. Functions take a Db so tests can pass
// an in-memory database; pages call them with getDb().

import { randomInt } from "node:crypto";
import { z } from "zod";
import { DbError, PG_EXCLUSION_VIOLATION, PG_UNIQUE_VIOLATION, type Db } from "./db";
import { freeSlots, type Busy, type Slot } from "./schedule";
import { addDays, isIsoDate, toInstant, toLocal, type LocalTime } from "./time";

export type Status = "booked" | "in_progress" | "done" | "cancelled";
export const STATUSES: Status[] = ["booked", "in_progress", "done", "cancelled"];

export type Service = {
  id: number;
  slug: string;
  name_az: string;
  name_en: string;
  part: string;
  duration_min: number;
  price_azn: number;
  active: boolean;
  sort: number;
};

export type DayBooking = {
  id: number;
  code: string;
  bay: number;
  start: number; // minutes, Baku time
  end: number;
  status: Status;
  parts: string[];
  services: string[]; // slugs
  customer: string;
  phone: string;
  car: string;
  note: string | null;
  total: number;
  source: "web" | "demo";
};

/* ---------- services ---------- */

export async function listServices(db: Db, opts: { activeOnly?: boolean } = {}) {
  return db.query<Service>(
    `SELECT id, slug, name_az, name_en, part, duration_min, price_azn, active, sort
       FROM services ${opts.activeOnly ? "WHERE active" : ""}
      ORDER BY sort, id`,
  );
}

/* ---------- reading a day ---------- */

type BookingRow = Omit<DayBooking, "start" | "end" | "bay" | "parts" | "services"> & {
  bay_id: number;
  starts_at: Date | string;
  ends_at: Date | string;
  parts: string[] | null;
  services: string[] | null;
};

function rowToBooking(r: BookingRow): DayBooking {
  const start = toLocal(new Date(r.starts_at));
  const end = toLocal(new Date(r.ends_at));
  return {
    id: r.id,
    code: r.code,
    bay: r.bay_id,
    start: start.minutes,
    end: end.date === start.date ? end.minutes : 24 * 60,
    status: r.status,
    parts: r.parts ?? [],
    services: r.services ?? [],
    customer: r.customer,
    phone: r.phone,
    car: r.car,
    note: r.note,
    total: r.total,
    source: r.source,
  };
}

const BOOKING_SELECT = `
  SELECT b.id, b.code, b.bay_id, lower(b.period) AS starts_at, upper(b.period) AS ends_at,
         b.status, b.customer, b.phone, b.car, b.note, b.total_azn AS total, b.source,
         array_agg(DISTINCT s.part) FILTER (WHERE s.part IS NOT NULL) AS parts,
         array_agg(s.slug ORDER BY s.sort) FILTER (WHERE s.slug IS NOT NULL) AS services
    FROM bookings b
    LEFT JOIN booking_services bs ON bs.booking_id = b.id
    LEFT JOIN services s ON s.id = bs.service_id`;

export async function dayBookings(db: Db, date: string, opts: { includeCancelled?: boolean } = {}) {
  const rows = await db.query<BookingRow>(
    `${BOOKING_SELECT}
      WHERE b.period && tstzrange($1, $2)
        ${opts.includeCancelled ? "" : "AND b.status <> 'cancelled'"}
      GROUP BY b.id
      ORDER BY lower(b.period), b.bay_id`,
    [toInstant(date, 0), toInstant(addDays(date, 1), 0)],
  );
  return rows.map(rowToBooking);
}

export async function bookingByCode(db: Db, code: string) {
  const rows = await db.query<BookingRow & { date?: string }>(
    `${BOOKING_SELECT} WHERE b.code = $1 GROUP BY b.id`,
    [code.toUpperCase()],
  );
  if (!rows[0]) return null;
  return { ...rowToBooking(rows[0]), date: toLocal(new Date(rows[0].starts_at)).date };
}

export async function availability(db: Db, date: string, duration: number, now: LocalTime) {
  const busy: Busy[] = (await dayBookings(db, date)).map((b) => ({
    bay: b.bay,
    start: b.start,
    end: b.end,
  }));
  return freeSlots({ date, duration, busy, now });
}

/** First slot from now on that fits `duration`, scanning up to two weeks. */
export async function nextFreeSlot(db: Db, duration: number, now: LocalTime) {
  for (let i = 0; i < 14; i++) {
    const date = addDays(now.date, i);
    const slots = await availability(db, date, duration, now);
    if (slots[0]) return { date, start: slots[0].start };
  }
  return null;
}

/* ---------- creating a booking ---------- */

export const bookingInput = z.object({
  services: z.array(z.string().regex(/^[a-z-]+$/)).min(1).max(8),
  date: z.string().refine(isIsoDate, "date"),
  start: z.coerce.number().int().min(0).max(24 * 60),
  customer: z.string().trim().min(2, "name").max(80, "name"),
  phone: z
    .string()
    .transform((v) => v.replace(/[\s()-]/g, ""))
    .pipe(z.string().regex(/^(\+994|0)?(10|12|50|51|55|60|70|77|99)\d{7}$/, "phone"))
    // one stored form for every way of writing it: 050..., 50..., +99450...
    .transform((v) => `+994${v.replace(/^(\+994|0)/, "")}`),
  car: z.string().trim().min(2, "car").max(60, "car"),
  note: z.string().trim().max(300).optional().transform((v) => v || null),
});
export type BookingInput = z.input<typeof bookingInput>;

export type CreateResult =
  | { ok: true; code: string; bay: number; start: number; end: number; total: number }
  | { ok: false; error: "invalid" | "unknown_service" | "slot_taken"; fields?: string[] };

const CODE_ALPHABET = "ACDEFHJKLMNPRTUVWXY3479"; // no 0/O, 1/I, 2/Z, 5/S, 6/G, 8/B lookalikes

export function newCode(): string {
  let s = "";
  for (let i = 0; i < 5; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `R-${s}`;
}

export async function createBooking(
  db: Db,
  raw: BookingInput,
  now: LocalTime,
  opts: { source?: "web" | "demo"; status?: Status } = {},
): Promise<CreateResult> {
  const parsed = bookingInput.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))];
    return { ok: false, error: "invalid", fields };
  }
  const input = parsed.data;
  const slugs = [...new Set(input.services)];

  const services = await db.query<Service>(
    "SELECT * FROM services WHERE active AND slug = ANY($1::text[])",
    [slugs],
  );
  if (services.length !== slugs.length) return { ok: false, error: "unknown_service" };

  const duration = services.reduce((sum, s) => sum + s.duration_min, 0);
  const total = services.reduce((sum, s) => sum + s.price_azn, 0);

  // 1. Application check: is this start time one of today's free slots?
  const slots: Slot[] = await availability(db, input.date, duration, now);
  const slot = slots.find((s) => s.start === input.start);
  if (!slot) return { ok: false, error: "slot_taken" };

  // 2. Database check: try the free bays one by one. If another request took the bay
  //    between step 1 and now, the EXCLUDE constraint rejects the insert (23P01) and
  //    we move on to the next bay. Booking and its services go in ONE statement,
  //    so there is never a booking without services.
  const from = toInstant(input.date, input.start);
  const to = toInstant(input.date, input.start + duration);
  for (const bay of slot.freeBays) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = newCode();
      try {
        await db.query(
          `WITH b AS (
             INSERT INTO bookings (code, bay_id, period, status, customer, phone, car, note, total_azn, source)
             VALUES ($1, $2, tstzrange($3, $4), $5, $6, $7, $8, $9, $10, $11)
             RETURNING id
           )
           INSERT INTO booking_services (booking_id, service_id, price_azn)
           SELECT b.id, s.id, s.price_azn FROM b, services s WHERE s.id = ANY($12::int[])`,
          [
            code, bay, from, to, opts.status ?? "booked", input.customer, input.phone,
            input.car, input.note, total, opts.source ?? "web", services.map((s) => s.id),
          ],
        );
        return { ok: true, code, bay, start: input.start, end: input.start + duration, total };
      } catch (err) {
        if (err instanceof DbError && err.code === PG_UNIQUE_VIOLATION) continue; // code clash, new code
        if (err instanceof DbError && err.code === PG_EXCLUSION_VIOLATION) break; // bay taken, next bay
        throw err;
      }
    }
  }
  return { ok: false, error: "slot_taken" };
}

/* ---------- admin ---------- */

export async function setStatus(db: Db, id: number, status: Status) {
  await db.query("UPDATE bookings SET status = $2 WHERE id = $1", [id, status]);
}

export async function updateService(
  db: Db,
  id: number,
  patch: { price_azn: number; duration_min: number; active: boolean },
) {
  await db.query(
    "UPDATE services SET price_azn = $2, duration_min = $3, active = $4 WHERE id = $1",
    [id, patch.price_azn, patch.duration_min, patch.active],
  );
}
