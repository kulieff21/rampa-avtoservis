"use server";

// Server Action: the booking form posts here. It runs only on the server, so the
// browser never talks to the database directly. On success it redirects to the
// job card; on failure it returns an error the form shows next to the field.

import { after } from "next/server";
import { redirect } from "next/navigation";
import { isLocale } from "@/i18n/dict";
import { createBooking } from "@/lib/bookings";
import { getDb } from "@/lib/db";
import { notifyNewBooking } from "@/lib/notify";
import { toLocal } from "@/lib/time";

export type BookState = {
  error?: "invalid" | "unknown_service" | "slot_taken" | "generic";
  fields?: string[];
  attempt?: number; // changes on every failed submit, so the form can react to it
};

export async function bookAction(prev: BookState, form: FormData): Promise<BookState> {
  const locale = String(form.get("locale"));
  if (!isLocale(locale)) return { error: "generic", attempt: (prev.attempt ?? 0) + 1 };

  // Honeypot: a field people never see. Bots fill every input.
  if (form.get("website")) redirect(`/${locale}`);

  const input = {
    services: form.getAll("services").map(String),
    date: String(form.get("date") ?? ""),
    start: String(form.get("start") ?? ""),
    customer: String(form.get("customer") ?? ""),
    phone: String(form.get("phone") ?? ""),
    car: String(form.get("car") ?? ""),
    note: String(form.get("note") ?? ""),
  };

  const db = await getDb();
  const result = await createBooking(db, input, toLocal(new Date()));
  if (!result.ok) {
    return { error: result.error, fields: result.fields, attempt: (prev.attempt ?? 0) + 1 };
  }

  // after(): runs once the response is sent, so a slow Telegram API never makes
  // the customer wait for their job card.
  after(() =>
    notifyNewBooking({
      ...result,
      date: input.date,
      car: input.car,
      customer: input.customer,
      phone: input.phone,
      services: input.services,
    }),
  );

  redirect(`/${locale}/booking/${result.code}`);
}
