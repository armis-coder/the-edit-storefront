import { after, NextResponse } from "next/server";
import { placeOrder } from "@/lib/store/orders";
import { apiError, clientKey, hash, rateLimit, readJson, requireSameOrigin } from "@/lib/store/security";
import { checkoutSchema, StoreError } from "@/lib/store/validation";
import { sendQueuedEmails } from "@/lib/store/email";
import { activeCommerceProvider } from "@/lib/commerce/provider";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    if (activeCommerceProvider() !== "independent") throw new StoreError("Orders are not open yet.",503);
    const input = checkoutSchema.parse(await readJson(request,18000));
    await rateLimit(`orders:${clientKey(request)}`,15,3600);
    await rateLimit(`phone:${hash(input.customer.phone.replace(/^(?:\+92|0092)/,"0"))}`,8,3600);
    await rateLimit("orders-global",200,3600);
    const order = await placeOrder(input);
    after(async () => { try { await sendQueuedEmails(); } catch { /* Saved order remains valid when email delivery fails. */ } });
    return NextResponse.json(order,{ status: order.repeated ? 200 : 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
