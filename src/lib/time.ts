// Baku is UTC+4 all year (no daylight saving since 2016), so a fixed offset is exact.
// Inside the app a moment is described as { date: "YYYY-MM-DD", minutes: 0..1439 }
// in Baku time; only the database stores real instants (timestamptz).

export const BAKU_OFFSET_MIN = 240;

export type LocalTime = { date: string; minutes: number };

export function toLocal(instant: Date): LocalTime {
  const shifted = new Date(instant.getTime() + BAKU_OFFSET_MIN * 60_000);
  return {
    date: shifted.toISOString().slice(0, 10),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

export function toInstant(date: string, minutes: number): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, minutes) - BAKU_OFFSET_MIN * 60_000);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return addDays(value, 0) === value; // rejects 2026-02-31
}

export function hhmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
