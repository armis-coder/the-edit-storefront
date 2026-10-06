import { NextResponse } from "next/server";
import { quoteBag } from "@/lib/store/orders";
import { apiError, clientKey, rateLimit, readJson, requireSameOrigin } from "@/lib/store/security";
import { activeCommerceProvider } from "@/lib/commerce/provider";
import { StoreError } from "@/lib/store/validation";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    if (activeCommerceProvider() !== "independent") throw new StoreError("Orders are not open yet.",503);
    await rateLimit(`quote:${clientKey(request)}`,120,300);
    return NextResponse.json(await quoteBag(await readJson(request,12000)),{ headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
