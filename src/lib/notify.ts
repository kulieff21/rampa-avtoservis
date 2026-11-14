// Tells the workshop owner about a new booking on Telegram.
// Without TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID it does nothing, so local
// development and the public demo never send messages.

import { hhmm } from "./time";

export async function notifyNewBooking(b: {
  code: string;
  date: string;
  start: number;
  end: number;
  bay: number;
  car: string;
  customer: string;
  phone: string;
  services: string[];
  total: number;
}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { sent: false as const, reason: "not configured" };

  const text = [
    `New booking ${b.code}`,
    `${b.date} ${hhmm(b.start)}–${hhmm(b.end)}, bay ${b.bay}`,
    `${b.car} · ${b.services.join(", ")}`,
    `${b.customer}, ${b.phone}`,
    `${b.total} AZN`,
  ].join("\n");

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) console.error("telegram notify failed", res.status);
  return { sent: res.ok };
}
