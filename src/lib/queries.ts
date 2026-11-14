// Data for pages. Two kinds:
//  - cached ("use cache"): the price list. It goes into the prerendered page and
//    is refreshed on demand when the admin edits a service (updateTag("services")).
//  - per request (connection()): anything that depends on the current time or on
//    bookings. These run inside <Suspense> and stream in after the static shell.

import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { bookingByCode, dayBookings, listServices, nextFreeSlot } from "./bookings";
import { getDb } from "./db";
import { ensureDemoDay } from "./demo";
import { CLOSE, isOpenDay } from "./schedule";
import { addDays, toLocal } from "./time";

// The demo workshop must never look empty: today and the next three days always
// have demo jobs. ensureDemoDay is idempotent (one count query per day once filled);
// the daily cron route does the same work in the background.
async function ensureDemoDays(db: Awaited<ReturnType<typeof getDb>>, today: string) {
  for (let i = 0; i < 4; i++) await ensureDemoDay(db, addDays(today, i));
}

export async function getServices() {
  "use cache";
  cacheLife("hours");
  cacheTag("services");
  return listServices(await getDb(), { activeOnly: true });
}

/** Which day the live floor shows, the jobs on it, and the time it was read. */
export async function getFloor() {
  await connection();
  const db = await getDb();
  const now = toLocal(new Date());

  // Today, unless we are closed for the rest of it: then the next working day.
  let date = now.date;
  if (!isOpenDay(date) || now.minutes >= CLOSE) {
    date = addDays(date, 1);
    while (!isOpenDay(date)) date = addDays(date, 1);
  }

  await ensureDemoDays(db, now.date);

  const jobs = (await dayBookings(db, date)).map((b) => ({
    // Only what the public board needs: no names, phones or cars.
    code: b.code,
    bay: b.bay,
    start: b.start,
    end: b.end,
    parts: b.parts,
    services: b.services,
  }));
  return { date, isToday: date === now.date, now: now.minutes, jobs };
}

export async function getNextFree(duration = 60) {
  await connection();
  const now = toLocal(new Date());
  const db = await getDb();
  await ensureDemoDays(db, now.date);
  const slot = await nextFreeSlot(db, duration, now);
  return { slot, today: now.date, tomorrow: addDays(now.date, 1) };
}

export async function getTicket(code: string) {
  await connection();
  return bookingByCode(await getDb(), code);
}
