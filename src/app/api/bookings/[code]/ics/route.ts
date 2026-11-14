// GET /api/bookings/R-XXXXX/ics -> a calendar file (iCalendar, RFC 5545) for the
// booking, so the customer's phone reminds them on the day.

import { bookingByCode } from "@/lib/bookings";
import { getDb } from "@/lib/db";
import { toInstant } from "@/lib/time";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export async function GET(_request: Request, ctx: RouteContext<"/api/bookings/[code]/ics">) {
  const { code } = await ctx.params;
  if (!/^R-[A-Z0-9]{5}$/i.test(code)) return new Response("Not found", { status: 404 });
  const b = await bookingByCode(await getDb(), code);
  if (!b || b.status === "cancelled") return new Response("Not found", { status: 404 });

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rampa//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${b.code}@rampa`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(toInstant(b.date, b.start))}`,
    `DTEND:${stamp(toInstant(b.date, b.end))}`,
    `SUMMARY:Rampa ${b.code}, bay ${b.bay}`,
    "LOCATION:Nobel Avenue 44\\, Baku",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="rampa-${b.code}.ics"`,
      "cache-control": "no-store",
    },
  });
}
