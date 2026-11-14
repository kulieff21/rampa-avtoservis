// Rampa is a fictional workshop, so its floor would be empty without made-up work.
// ensureDemoDay() fills one day with believable bookings (marked source = 'demo').
// The generator is seeded by the date, so the same day always gets the same plan.

import type { Db } from "./db";
import { listServices, newCode } from "./bookings";
import { BAY_IDS, CLOSE, OPEN, STEP, isOpenDay } from "./schedule";
import { toInstant } from "./time";

const CARS = [
  "Toyota Prius", "Hyundai Elantra", "Kia Sportage", "Mercedes E 200", "Chevrolet Cobalt",
  "Lada Priora", "Toyota Camry", "Hyundai Tucson", "BMW 520d", "Kia Rio", "Nissan Qashqai",
  "Volkswagen Passat", "Ford Transit", "Lexus RX 350",
];
const NAMES = [
  "Rauf M.", "Nigar Ə.", "Elvin Q.", "Aysel H.", "Tural B.", "Leyla S.", "Orxan C.",
  "Günel R.", "Kamran İ.", "Səbinə Y.", "Fərid N.", "Aynur T.",
];
const COMBOS = [
  ["oil"], ["brakes"], ["tyres", "alignment"], ["diagnostics"], ["oil", "battery"],
  ["ac"], ["suspension", "alignment"], ["diagnostics", "suspension"], ["brakes", "tyres"],
  ["oil", "diagnostics"],
];

function seeded(text: string) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export async function ensureDemoDay(db: Db, date: string): Promise<number> {
  if (!isOpenDay(date)) return 0;
  const [{ n }] = await db.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM bookings
      WHERE source = 'demo' AND period && tstzrange($1, $2)`,
    [toInstant(date, 0), toInstant(date, 24 * 60)],
  );
  if (n > 0) return 0;

  const services = await listServices(db, { activeOnly: true });
  const bySlug = new Map(services.map((s) => [s.slug, s]));
  const rand = seeded(date);
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  let created = 0;

  for (const bay of BAY_IDS) {
    let t = OPEN + Math.floor(rand() * 3) * STEP;
    while (t < CLOSE) {
      const combo = pick(COMBOS).map((slug) => bySlug.get(slug)).filter((s) => s !== undefined);
      const duration = combo.reduce((sum, s) => sum + s.duration_min, 0);
      if (!combo.length || t + duration > CLOSE) break;
      const total = combo.reduce((sum, s) => sum + s.price_azn, 0);
      try {
        await db.query(
          `WITH b AS (
             INSERT INTO bookings (code, bay_id, period, customer, phone, car, total_azn, source)
             VALUES ($1, $2, tstzrange($3, $4), $5, $6, $7, $8, 'demo')
             RETURNING id
           )
           INSERT INTO booking_services (booking_id, service_id, price_azn)
           SELECT b.id, s.id, s.price_azn FROM b, services s WHERE s.id = ANY($9::int[])`,
          [
            newCode(), bay, toInstant(date, t), toInstant(date, t + duration), pick(NAMES),
            `+99450000${String(Math.floor(rand() * 9000) + 1000)}`, pick(CARS), total,
            combo.map((s) => s.id),
          ],
        );
        created++;
      } catch {
        // A real customer already holds this time on this bay: skip it.
      }
      // Leave gaps so the day stays bookable: 30 to 120 minutes of free floor.
      t += Math.ceil(duration / STEP) * STEP + (1 + Math.floor(rand() * 4)) * STEP;
    }
  }
  return created;
}
