// Runs against a real Postgres (PGlite, in memory): the double-booking guarantee
// lives in the database, so it has to be tested against the database.

import { beforeEach, describe, expect, it } from "vitest";
import { createPglite, DbError, PG_EXCLUSION_VIOLATION, type Db } from "../src/lib/db";
import { availability, bookingByCode, createBooking, dayBookings, setStatus } from "../src/lib/bookings";
import { ensureDemoDay } from "../src/lib/demo";
import { toInstant } from "../src/lib/time";

const MONDAY = "2026-11-16";
const now = { date: MONDAY, minutes: 6 * 60 };
const customer = { customer: "Test Driver", phone: "+994 50 123 45 67", car: "Kia Rio" };

let db: Db;
beforeEach(async () => {
  db = await createPglite(); // fresh in-memory database, migrated
}, 30_000);

describe("createBooking", () => {
  it("books, prices and reads back a job", async () => {
    const res = await createBooking(db, { ...customer, services: ["oil", "battery"], date: MONDAY, start: 600 }, now);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.end - res.start).toBe(60); // 45 + 15 minutes
    expect(res.total).toBe(45); // 35 + 10 AZN
    const saved = await bookingByCode(db, res.code);
    expect(saved?.services.sort()).toEqual(["battery", "oil"]);
    expect(saved?.phone).toBe("+994501234567");
    const local = await createBooking(db, { ...customer, phone: "055 765 43 21", services: ["oil"], date: MONDAY, start: 720 }, now);
    if (local.ok) expect((await bookingByCode(db, local.code))?.phone).toBe("+994557654321");
    expect(local.ok).toBe(true);
  });

  it("fills three bays, then refuses the fourth car", async () => {
    const input = { ...customer, services: ["brakes"], date: MONDAY, start: 600 };
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await createBooking(db, input, now));
    expect(results.map((r) => r.ok)).toEqual([true, true, true, false]);
    expect(new Set(results.filter((r) => r.ok).map((r) => r.ok && r.bay))).toEqual(new Set([1, 2, 3]));
    expect(results[3]).toMatchObject({ ok: false, error: "slot_taken" });
  });

  it("frees the bay again when a booking is cancelled", async () => {
    const input = { ...customer, services: ["brakes"], date: MONDAY, start: 600 };
    const ids = [];
    for (let i = 0; i < 3; i++) {
      const r = await createBooking(db, input, now);
      if (r.ok) ids.push((await bookingByCode(db, r.code))!.id);
    }
    expect((await createBooking(db, input, now)).ok).toBe(false);
    await setStatus(db, ids[0], "cancelled");
    expect((await createBooking(db, input, now)).ok).toBe(true);
  });

  it("rejects bad input with the failing fields", async () => {
    const res = await createBooking(db, { services: ["oil"], date: MONDAY, start: 600, customer: "A", phone: "123", car: "Kia" }, now);
    expect(res).toMatchObject({ ok: false, error: "invalid" });
    if (!res.ok) expect(res.fields?.sort()).toEqual(["customer", "phone"]);
  });

  it("rejects an off-grid or past start time", async () => {
    const offGrid = await createBooking(db, { ...customer, services: ["oil"], date: MONDAY, start: 610 }, now);
    const past = await createBooking(db, { ...customer, services: ["oil"], date: MONDAY, start: 540 }, { date: MONDAY, minutes: 700 });
    expect(offGrid).toMatchObject({ ok: false, error: "slot_taken" });
    expect(past).toMatchObject({ ok: false, error: "slot_taken" });
  });

  it("rejects unknown services", async () => {
    const res = await createBooking(db, { ...customer, services: ["teleport"], date: MONDAY, start: 600 }, now);
    expect(res).toMatchObject({ ok: false, error: "unknown_service" });
  });
});

describe("database guarantee", () => {
  it("refuses an overlapping booking on the same bay even if the app check is skipped", async () => {
    const insert = (from: number, to: number) =>
      db.query(
        `INSERT INTO bookings (code, bay_id, period, customer, phone, car, total_azn)
         VALUES ($1, 1, tstzrange($2, $3), 'x', 'x', 'x', 0)`,
        [`R-T${from}`, toInstant(MONDAY, from), toInstant(MONDAY, to)],
      );
    await insert(600, 690);
    await expect(insert(660, 720)).rejects.toSatisfy(
      (e) => e instanceof DbError && e.code === PG_EXCLUSION_VIOLATION,
    );
    await expect(insert(690, 720)).resolves.toBeDefined(); // touching is fine
  });
});

describe("demo day", () => {
  it("fills a day once and leaves room to book", async () => {
    const first = await ensureDemoDay(db, MONDAY);
    expect(first).toBeGreaterThan(5);
    expect(await ensureDemoDay(db, MONDAY)).toBe(0);
    expect((await dayBookings(db, MONDAY)).length).toBe(first);
    expect((await availability(db, MONDAY, 60, now)).length).toBeGreaterThan(0);
  });
});
