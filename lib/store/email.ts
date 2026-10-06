import { getStoreDb } from "./database";
import type { OrderRecord } from "./orders";
import { priceText } from "./orders";

export async function sendQueuedEmails() {
  if (!process.env.RESEND_API_KEY || !process.env.STORE_EMAIL_FROM) return { enabled: false, sent: 0 };
  const db = await getStoreDb(); let sent = 0;
  const { rows } = await db.query<{ id: string; kind: string; order: OrderRecord }>(`UPDATE edit_store.outbox SET attempts=attempts+1,last_attempt_at=now() WHERE id IN (SELECT id FROM edit_store.outbox WHERE sent_at IS NULL AND attempts<10 AND (last_attempt_at IS NULL OR last_attempt_at<now()-interval '5 minutes') ORDER BY attempts LIMIT 10 FOR UPDATE SKIP LOCKED) RETURNING id,kind,(SELECT row_to_json(o) FROM edit_store.orders o WHERE o.id=order_id) AS "order"`);
  for (const item of rows) {
    const order = item.order; const customer = item.kind === "customer_receipt";
    const to = customer ? order.data.customer.email : process.env.STORE_ORDER_EMAIL ?? order.data.contactEmail;
    if (!to) continue;
    const text = customer
      ? `Hello ${order.data.customer.name},\n\nWe received ${order.reference}. Total: ${priceText(order.data.totalPaisa)}.\n${order.data.paymentMethod === "cod" ? "Payment: cash on delivery." : `Payment: bank transfer.\n${order.data.bankInstructions}`}\n\nYour order is pending confirmation. Contact ${order.data.contactEmail} or ${order.data.contactPhone} with your reference.`
      : `New order ${order.reference}\n${priceText(order.data.totalPaisa)} · ${order.data.paymentMethod}\nReview and confirm it in your store admin.`;
    try {
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": item.id }, body: JSON.stringify({ from: process.env.STORE_EMAIL_FROM, to: [to], subject: customer ? `Order received — ${order.reference}` : `New order — ${order.reference}`, text }), signal: AbortSignal.timeout(8000) });
      if (response.ok) { await db.query("UPDATE edit_store.outbox SET sent_at=now() WHERE id=$1",[item.id]); sent++; }
    } catch { /* The outbox retains failed sends for an owner-triggered retry. */ }
  }
  return { enabled: true, sent };
}
