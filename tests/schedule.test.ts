import { describe, expect, it } from "vitest";
import { CLOSE, OPEN, freeSlots, isOpenDay, overlaps } from "../src/lib/schedule";
import { addDays, hhmm, isIsoDate, toInstant, toLocal } from "../src/lib/time";

const MONDAY = "2026-11-16";
const nowEarly = { date: MONDAY, minutes: 6 * 60 }; // 06:00, before opening

describe("time helpers", () => {
  it("round-trips Baku local time through an instant", () => {
    const instant = toInstant(MONDAY, 9 * 60 + 30);
    expect(instant.toISOString()).toBe("2026-11-16T05:30:00.000Z");
    expect(toLocal(instant)).toEqual({ date: MONDAY, minutes: 570 });
  });
  it("rejects impossible dates", () => {
    expect(isIsoDate("2026-02-31")).toBe(false);
    expect(isIsoDate("2026-02-28")).toBe(true);
  });
  it("formats minutes", () => expect(hhmm(545)).toBe("09:05"));
});

describe("overlaps", () => {
  it("treats touching ranges as free", () => expect(overlaps(60, 120, 120, 180)).toBe(false));
  it("catches one shared minute", () => expect(overlaps(60, 121, 120, 180)).toBe(true));
});

describe("freeSlots", () => {
  it("is closed on Sunday", () => {
    expect(isOpenDay("2026-11-15")).toBe(false);
    expect(freeSlots({ date: "2026-11-15", duration: 30, busy: [], now: { date: "2026-11-15", minutes: 0 } })).toEqual([]);
  });

  it("offers every 30 minutes and lets the job finish by closing time", () => {
    const slots = freeSlots({ date: MONDAY, duration: 90, busy: [], now: nowEarly });
    expect(slots[0].start).toBe(OPEN);
    expect(slots.at(-1)!.start).toBe(CLOSE - 90);
    expect(slots.every((s) => s.freeBays.length === 3)).toBe(true);
  });

  it("drops a slot only when every bay is busy", () => {
    const busy = [1, 2, 3].map((bay) => ({ bay, start: 600, end: 660 }));
    const slots = freeSlots({ date: MONDAY, duration: 30, busy, now: nowEarly });
    const starts = slots.map((s) => s.start);
    expect(starts).not.toContain(600);
    expect(starts).not.toContain(630);
    expect(starts).toContain(660);
  });

  it("reports which bays are free", () => {
    const busy = [{ bay: 2, start: 540, end: 720 }];
    const [first] = freeSlots({ date: MONDAY, duration: 60, busy, now: nowEarly });
    expect(first.freeBays).toEqual([1, 3]);
  });

  it("keeps one hour of lead time today", () => {
    const now = { date: MONDAY, minutes: 10 * 60 + 10 }; // 10:10
    const [first] = freeSlots({ date: MONDAY, duration: 30, busy: [], now });
    expect(hhmm(first.start)).toBe("11:30");
  });

  it("refuses dates in the past or beyond two weeks", () => {
    expect(freeSlots({ date: addDays(MONDAY, -1), duration: 30, busy: [], now: nowEarly })).toEqual([]);
    expect(freeSlots({ date: addDays(MONDAY, 14), duration: 30, busy: [], now: nowEarly })).toEqual([]);
  });
});
