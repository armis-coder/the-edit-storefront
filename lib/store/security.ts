import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getStoreDb } from "./database";
import { StoreError } from "./validation";

const COOKIE = "edit_owner";
export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
function secret() { const value = process.env.ADMIN_SESSION_SECRET; if (!value || value.length < 32) throw new StoreError("Owner sign-in has not been configured.", 503); return value; }
export function passwordMatches(password: string) {
  const encoded = process.env.ADMIN_PASSWORD_HASH ?? "";
  const [salt, digest] = encoded.split(":");
  if (!/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(digest ?? "")) throw new StoreError("Owner sign-in has not been configured.", 503);
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(digest, "hex"));
}
function sessionSignature(payload: string) { return createHmac("sha256", secret()).update(payload + ":" + hash(process.env.ADMIN_PASSWORD_HASH ?? "")).digest("hex"); }
export function createSession() { const payload = `${Date.now() + 8 * 60 * 60 * 1000}.${randomBytes(16).toString("hex")}`; return `${payload}.${sessionSignature(payload)}`; }
export function validSession(value: string | undefined) {
  if (!value || !/^\d{13}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(value)) return false;
  const [expiry, nonce, signature] = value.split(".");
  if (Number(expiry) <= Date.now() || Number(expiry) > Date.now() + 8 * 60 * 60 * 1000) return false;
  try { return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(sessionSignature(`${expiry}.${nonce}`), "hex")); } catch { return false; }
}
export async function isOwner() { return validSession((await cookies()).get(COOKIE)?.value); }
export async function requireOwner() { if (!await isOwner()) throw new StoreError("Please sign in to manage the store.", 401); }
export async function setSession(value: string) { (await cookies()).set(COOKIE, value, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: value ? 8 * 60 * 60 : 0 }); }

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.SITE_URL ? new URL(process.env.SITE_URL).origin : new URL(request.url).origin;
  if (!origin || origin !== expected) throw new StoreError("Request origin is not permitted.", 403);
}
export async function readBytes(request: Request, maximum: number) {
  if (Number(request.headers.get("content-length") ?? 0) > maximum) throw new StoreError("Request is too large.", 413);
  const reader = request.body?.getReader(); if (!reader) throw new StoreError("Request is empty.");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > maximum) { await reader.cancel(); throw new StoreError("Request is too large.", 413); } chunks.push(value); }
  return Buffer.concat(chunks);
}
export async function readJson(request: Request, maximum = 64000) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new StoreError("Send JSON content.", 415);
  try { return JSON.parse((await readBytes(request,maximum)).toString("utf8")); } catch (error) { if(error instanceof StoreError) throw error; throw new StoreError("Invalid request."); }
}
export function clientKey(request: Request) {
  // A custom proxy header is safe only when that proxy replaces client-supplied values.
  const header = process.env.VERCEL ? "x-vercel-forwarded-for" : process.env.STORE_TRUSTED_IP_HEADER;
  const ip = header ? request.headers.get(header)?.split(",")[0]?.trim() ?? "unknown" : "local";
  return hash(ip);
}
export async function rateLimit(key: string, limit: number, seconds: number) {
  const db = await getStoreDb();
  const { rows } = await db.query<{ hits: number }>(`INSERT INTO edit_store.rate_limits(key,hits,expires_at) VALUES($1,1,now()+($2*interval '1 second')) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN edit_store.rate_limits.expires_at<=now() THEN 1 ELSE edit_store.rate_limits.hits+1 END, expires_at=CASE WHEN edit_store.rate_limits.expires_at<=now() THEN EXCLUDED.expires_at ELSE edit_store.rate_limits.expires_at END RETURNING hits`, [key, seconds]);
  if (rows[0].hits > limit) throw new StoreError("Too many attempts. Please try again later.", 429);
}
export function apiError(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Check your details." }, { status: 400 });
  if (error instanceof StoreError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("Store operation failed", error instanceof Error ? error.name : "UnknownError");
  return NextResponse.json({ error: "We couldn't complete this request. Please try again." }, { status: 503 });
}
