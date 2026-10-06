import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, clientKey, createSession, passwordMatches, rateLimit, readJson, requireSameOrigin, setSession } from "@/lib/store/security";
import { StoreError } from "@/lib/store/validation";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const input = z.object({ email: z.email().max(180), password: z.string().min(1).max(256) }).parse(await readJson(request,4000));
    await rateLimit(`login:${clientKey(request)}`,5,900);
    await rateLimit("owner-login-global",30,900);
    const matched = passwordMatches(input.password);
    if (!matched || !process.env.ADMIN_EMAIL || input.email.toLowerCase() !== process.env.ADMIN_EMAIL.toLowerCase()) throw new StoreError("Email or password is incorrect.",401);
    await setSession(createSession()); return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request) {
  try { requireSameOrigin(request); await setSession(""); return NextResponse.json({ ok: true }); }
  catch (error) { return apiError(error); }
}
