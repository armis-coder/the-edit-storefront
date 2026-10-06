import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, clientKey, rateLimit, readJson, requireSameOrigin } from "@/lib/store/security";
import { getStoreDb } from "@/lib/store/database";
import { activeCommerceProvider } from "@/lib/commerce/provider";
import { StoreError } from "@/lib/store/validation";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    if (activeCommerceProvider() !== "independent") throw new StoreError("Email sign-up will open with the store.",503);
    const input = z.object({ email: z.email().max(180), consent: z.literal(true), website: z.literal("").default("") }).parse(await readJson(request,2000));
    await rateLimit(`subscribe:${clientKey(request)}`,5,3600);
    await (await getStoreDb()).query("INSERT INTO edit_store.subscribers(email) VALUES($1) ON CONFLICT DO NOTHING",[input.email.toLowerCase()]);
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
