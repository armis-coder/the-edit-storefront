import { NextResponse } from "next/server";
import { z } from "zod";
import { orderReceipt } from "@/lib/store/orders";
import { apiError, clientKey, rateLimit, readJson, requireSameOrigin } from "@/lib/store/security";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request); await rateLimit(`receipt:${clientKey(request)}`,100,300);
    const id = z.uuid().parse((await context.params).id);
    const { token } = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(await readJson(request,2000));
    return NextResponse.json(await orderReceipt(id,token),{ headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
