// Pure scheduling rules. No database, no clock: everything comes in as arguments,
// which is what makes this file easy to unit test.

import { addDays, weekday } from "./time";

export const OPEN = 9 * 60; // 09:00
export const CLOSE = 19 * 60; // 19:00
export const STEP = 30; // a slot starts every 30 minutes
export const LEAD = 60; // earliest booking is one hour from now
export const HORIZON_DAYS = 14; // bookable range: today + 13 days
export const BAY_IDS = [1, 2, 3];

export type Busy = { bay: number; start: number; end: number }; // minutes of one day
export type Slot = { start: number; freeBays: number[] };

export function isOpenDay(date: string): boolean {
  return weekday(date) !== 0; // closed on Sunday
}

export function bookableDates(today: string): string[] {
  return Array.from({ length: HORIZON_DAYS }, (_, i) => addDays(today, i));
}

export function isBookableDate(date: string, today: string): boolean {
  return isOpenDay(date) && bookableDates(today).includes(date);
}

/** True when [aStart, aEnd) and [bStart, bEnd) share at least one minute. */
export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

export function freeSlots(args: {
  date: string;
  duration: number;
  busy: Busy[];
  now: { date: string; minutes: number };
  bays?: number[];
}): Slot[] {
  const { date, duration, busy, now, bays = BAY_IDS } = args;
  if (duration <= 0 || duration > CLOSE - OPEN) return [];
  if (!isBookableDate(date, now.date)) return [];

  const slots: Slot[] = [];
  for (let start = OPEN; start + duration <= CLOSE; start += STEP) {
    if (date === now.date && start < now.minutes + LEAD) continue;
    const end = start + duration;
    const freeBays = bays.filter(
      (bay) => !busy.some((b) => b.bay === bay && overlaps(start, end, b.start, b.end)),
    );
    if (freeBays.length > 0) slots.push({ start, freeBays });
  }
  return slots;
}
