// Admin session: one shared password, a signed JWT in an HttpOnly cookie.
// proxy.ts does a quick check on every /admin request; each admin page and
// server action checks again with requireAdmin(), because the proxy is only
// a first filter, not the real guard.

import { createHash, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "rampa_admin";
const SESSION_HOURS = 8;

// Public demo: when ADMIN_PASSWORD is not set, this password works and the login
// page shows it, so anyone reviewing the project can open the admin board.
export const DEMO_PASSWORD = "rampa-demo";

export function isDemoLogin() {
  return !process.env.ADMIN_PASSWORD;
}

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production");
  }
  return new TextEncoder().encode(secret ?? "dev-only-secret-not-for-production-use");
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? DEMO_PASSWORD;
  // Hash both sides so the comparison always has equal length and constant time.
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function signSession(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export async function startSession() {
  (await cookies()).set(SESSION_COOKIE, await signSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function requireAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySession(token))) redirect("/admin/login");
}
