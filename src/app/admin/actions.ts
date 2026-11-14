"use server";

// Admin Server Actions. Every action checks the session itself (requireAdmin):
// a Server Action is a public POST endpoint, and the proxy check is only a filter
// for page visits.

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkPassword, endSession, requireAdmin, startSession } from "@/lib/auth";
import { setStatus, STATUSES, updateService } from "@/lib/bookings";
import { getDb } from "@/lib/db";

export type LoginState = { error?: string };
export type ServiceState = { saved?: number; error?: string };

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const password = String(form.get("password") ?? "");
  // A small fixed delay makes password guessing slow without any state to keep.
  await new Promise((r) => setTimeout(r, 400));
  if (!checkPassword(password)) return { error: "Wrong password." };
  await startSession();
  redirect("/admin");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

const statusInput = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(STATUSES as [string, ...string[]]),
});

export async function setStatusAction(form: FormData) {
  await requireAdmin();
  const parsed = statusInput.safeParse({ id: form.get("id"), status: form.get("status") });
  if (!parsed.success) return;
  await setStatus(await getDb(), parsed.data.id, parsed.data.status as (typeof STATUSES)[number]);
  refresh(); // re-render the board the admin is looking at
}

const serviceInput = z.object({
  id: z.coerce.number().int().positive(),
  price_azn: z.coerce.number().int().min(0).max(5000),
  duration_min: z.coerce.number().int().min(15).max(600).multipleOf(15),
  active: z.boolean(),
});

export async function updateServiceAction(_prev: ServiceState, form: FormData): Promise<ServiceState> {
  await requireAdmin();
  const parsed = serviceInput.safeParse({
    id: form.get("id"),
    price_azn: form.get("price_azn"),
    duration_min: form.get("duration_min"),
    active: form.get("active") === "on",
  });
  if (!parsed.success) return { error: "Price 0-5000, time in steps of 15 minutes." };
  await updateService(await getDb(), parsed.data.id, parsed.data);
  // The public price list is cached with cacheTag("services"): expire it now so
  // the next visitor (and this admin) sees the new price immediately.
  updateTag("services");
  return { saved: Date.now() };
}
