import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, readJson, requireOwner, requireSameOrigin } from "@/lib/store/security";
import { getStoreDb } from "@/lib/store/database";
import { getSettings, listProducts, saveProduct } from "@/lib/store/catalogue";
import { orderStatuses, updateOrder } from "@/lib/store/orders";
import { sendQueuedEmails } from "@/lib/store/email";
import { settingsSchema, StoreError } from "@/lib/store/validation";

type Context = { params: Promise<{ resource: string }> };
export async function GET(request: Request, context: Context) {
  try {
    await requireOwner(); const { resource } = await context.params; const db = await getStoreDb();
    let result: unknown;
    if (resource === "products") result = { products: await listProducts(true,db) };
    else if (resource === "settings") result = { settings: await getSettings(db) };
    else if (resource === "orders") {
      const before = new URL(request.url).searchParams.get("before");
      if (before) z.iso.datetime({ offset: true }).parse(before);
      const { rows } = await db.query("SELECT id,reference,status,payment_status,data,created_at,updated_at FROM edit_store.orders WHERE ($1::timestamptz IS NULL OR created_at<$1::timestamptz) ORDER BY created_at DESC LIMIT 101",[before]);
      result = { orders: rows.slice(0,100), more: rows.length > 100 };
    } else if (resource === "subscribers") result = { subscribers: (await db.query("SELECT email,created_at FROM edit_store.subscribers ORDER BY created_at DESC LIMIT 1000")).rows };
    else if (resource === "health") result = { database: true, emailConfigured: !!(process.env.RESEND_API_KEY && process.env.STORE_EMAIL_FROM), pendingEmails: (await db.query<{ count: string }>("SELECT count(*) FROM edit_store.outbox WHERE sent_at IS NULL")).rows[0].count };
    else throw new StoreError("Not found.",404);
    return NextResponse.json(result,{ headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    requireSameOrigin(request); await requireOwner(); const { resource } = await context.params;
    const input = await readJson(request); let result: unknown;
    if (resource === "products") result = { product: await saveProduct(input) };
    else if (resource === "settings") { const settings = settingsSchema.parse(input); const db = await getStoreDb(); await db.query("UPDATE edit_store.settings SET data=$1 WHERE id=1",[JSON.stringify(settings)]); result = { settings }; }
    else if (resource === "orders") {
      const values = z.object({ id: z.uuid(), status: z.enum(orderStatuses), paymentStatus: z.enum(["unpaid","paid","refund_due","refunded"]), courier: z.string().trim().max(100), trackingNumber: z.string().trim().max(100), adminNote: z.string().trim().max(2000) }).parse(input);
      result = { order: await updateOrder(values.id,values) };
    } else if (resource === "email-retry") result = await sendQueuedEmails();
    else throw new StoreError("Not found.",404);
    return NextResponse.json(result,{ headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
