// GET /api/availability?date=2026-11-16&services=oil,brakes
// Free start times for that much work on that day. The booking page calls this
// every time the visitor picks a day.

import { availability } from "@/lib/bookings";
import { getDb } from "@/lib/db";
import { getServices } from "@/lib/queries";
import { isIsoDate, toLocal } from "@/lib/time";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? "";
  const slugs = (url.searchParams.get("services") ?? "").split(",").filter(Boolean);
  if (!isIsoDate(date) || slugs.length === 0 || slugs.length > 8) {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const services = (await getServices()).filter((s) => slugs.includes(s.slug));
  if (services.length !== new Set(slugs).size) {
    return Response.json({ error: "unknown service" }, { status: 400 });
  }
  const duration = services.reduce((sum, s) => sum + s.duration_min, 0);

  const slots = await availability(await getDb(), date, duration, toLocal(new Date()));
  return Response.json(
    { date, duration, slots: slots.map((s) => ({ start: s.start, free: s.freeBays.length })) },
    { headers: { "cache-control": "no-store" } },
  );
}
