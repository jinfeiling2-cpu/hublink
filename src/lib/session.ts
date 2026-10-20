import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "hublink_session";

function secret() {
  return process.env.SESSION_SECRET || "dev-only-hublink-session";
}

export function adminPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  if (process.env.NODE_ENV !== "production") return "dev-hublink-admin";
  return null;
}

export function usingDevPassword() {
  return !process.env.ADMIN_PASSWORD && process.env.NODE_ENV !== "production";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function sessionValue() {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 14;
  const payload = `ok.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export async function isAdmin() {
  const jar = await cookies();
  const value = jar.get(COOKIE)?.value;
  if (!value) return false;
  const [state, exp, sig] = value.split(".");
  if (state !== "ok" || !exp || !sig) return false;
  const payload = `${state}.${exp}`;
  const expected = sign(payload);
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
  return Number(exp) > Date.now();
}

export async function setAdminCookie() {
  const jar = await cookies();
  jar.set(COOKIE, sessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearAdminCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export function passwordMatches(input: string) {
  const expected = adminPassword();
  if (!expected) return false;
  const left = createHash("sha256").update(input).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}
