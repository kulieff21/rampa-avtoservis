// GET /api/cron/demo — called once a day by Vercel Cron (see vercel.json).
// Fills today and the next days with demo jobs so the public floor is never empty.
// Vercel sends "Authorization: Bearer $CRON_SECRET"; anything else is refused.

import { getDb } from "@/lib/db";
import { ensureDemoDay } from "@/lib/demo";
import { addDays, toLocal } from "@/lib/time";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const db = await getDb();
  const today = toLocal(new Date()).date;
  const created: Record<string, number> = {};
  for (let i = 0; i < 4; i++) {
    const date = addDays(today, i);
    created[date] = await ensureDemoDay(db, date);
  }
  return Response.json({ ok: true, created });
}
