import { createHmac, randomUUID } from "node:crypto";
import { getStoreDb, type Database } from "./database";
import { getSettings, type ProductRecord } from "./catalogue";
import { hash } from "./security";
import { amount, checkoutSchema, linesSchema, StoreError, type CheckoutInput, type StoreSettings } from "./validation";

export type QuoteLine = { merchandiseId: string; productId: string; title: string; variantTitle: string; quantity: number; unitPaisa: number; image: string | null };
export type Quote = { lines: QuoteLine[]; subtotalPaisa: number; shippingPaisa: number; totalPaisa: number; currencyCode: "PKR"; quoteToken: string };
export type OrderData = { customer: CheckoutInput["customer"]; paymentMethod: CheckoutInput["paymentMethod"]; lines: QuoteLine[]; subtotalPaisa: number; shippingPaisa: number; totalPaisa: number; bankInstructions: string; contactEmail: string; contactPhone: string; courier: string; trackingNumber: string; adminNote: string };
export type OrderRecord = { id: string; reference: string; status: OrderStatus; payment_status: "unpaid" | "paid" | "refund_due" | "refunded"; data: OrderData; created_at: string; updated_at: string };
export const orderStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = typeof orderStatuses[number];
const transitions: Record<OrderStatus, OrderStatus[]> = { pending: ["confirmed", "cancelled"], confirmed: ["processing", "cancelled"], processing: ["shipped", "cancelled"], shipped: ["delivered"], delivered: [], cancelled: [] };

function signature(value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new StoreError("Checkout has not been configured.", 503);
  return createHmac("sha256", secret).update(value).digest("hex");
}
function fingerprint(quote: Omit<Quote, "quoteToken">, settings: StoreSettings) { return hash(JSON.stringify({ ...quote, methods: [settings.codEnabled, settings.bankTransferEnabled], bank: settings.bankInstructions, policies: [settings.deliveryPolicy, settings.returnPolicy, settings.privacyPolicy] })); }
function verifyQuote(token: string, quote: Omit<Quote, "quoteToken">, settings: StoreSettings) {
  const [digest, expiry, mac] = token.split(".");
  if (!digest || !/^\d{13}$/.test(expiry ?? "") || Number(expiry) < Date.now() || mac !== signature(`${digest}.${expiry}`) || digest !== fingerprint(quote, settings)) throw new StoreError("Prices or delivery details changed. Review the refreshed total before placing your order.", 409);
}
async function resolveLines(db: Database, input: unknown, lock = false): Promise<QuoteLine[]> {
  const lines = linesSchema.parse(input);
  const combined = new Map<string, number>();
  for (const line of lines) combined.set(line.merchandiseId, (combined.get(line.merchandiseId) ?? 0) + line.quantity);
  if ([...combined.values()].some((n) => n > 20)) throw new StoreError("Maximum quantity is 20 per option.");
  const ids = [...combined.keys()].sort();
  const { rows } = await db.query<{ id: string; product_id: string; price_paisa: number; stock: number; status: string; data: ProductRecord["data"] }>(`SELECT v.id,v.product_id,v.price_paisa,v.stock,p.status,p.data FROM edit_store.variants v JOIN edit_store.products p ON p.id=v.product_id WHERE v.id=ANY($1::uuid[]) ORDER BY v.id ${lock ? "FOR UPDATE OF v,p" : ""}`, [ids]);
  return ids.map((id) => {
    const row = rows.find((r) => r.id === id); const quantity = combined.get(id)!;
    const variant = row?.data.variants.find((v) => v.id === id);
    if (!row || !variant || row.status !== "active" || row.data.editorial.restrictionStatus !== "none") throw new StoreError("An object in your bag is no longer available.", 409);
    if (row.stock < quantity) throw new StoreError(`${row.data.title}: only ${row.stock} available. Update your bag.`, 409);
    return { merchandiseId: id, productId: row.product_id, title: row.data.title, variantTitle: variant.title, quantity, unitPaisa: row.price_paisa, image: row.data.images[0]?.url ?? null };
  });
}
function pricedQuote(lines: QuoteLine[], settings: StoreSettings): Omit<Quote,"quoteToken"> {
  const subtotalPaisa = lines.reduce((sum,l) => sum + l.quantity*l.unitPaisa,0);
  const shippingPaisa = settings.freeShippingAbove > 0 && subtotalPaisa >= settings.freeShippingAbove*100 ? 0 : settings.shippingFee*100;
  return { lines, subtotalPaisa, shippingPaisa, totalPaisa: subtotalPaisa+shippingPaisa, currencyCode: "PKR" };
}
export async function quoteBag(input: unknown): Promise<Quote> {
  const db = await getStoreDb(); const settings = await getSettings(db);
  if (!settings.checkoutEnabled) throw new StoreError("Orders are not open yet. Please check back soon.", 503);
  const quote = pricedQuote(await resolveLines(db,input),settings);
  const payload = `${fingerprint(quote,settings)}.${Date.now()+15*60*1000}`;
  return { ...quote, quoteToken: `${payload}.${signature(payload)}` };
}

export async function placeOrder(value: unknown) {
  const input = checkoutSchema.parse(value);
  const requestHash = hash(JSON.stringify({ ...input, quoteToken: undefined }));
  const db = await getStoreDb();
  return db.transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(749201)");
    const { rows: previous } = await tx.query<OrderRecord & { access_hash: string; request_hash: string }>("SELECT * FROM edit_store.orders WHERE request_key=$1",[input.requestKey]);
    if (previous.length) {
      if (previous[0].request_hash !== requestHash || previous[0].access_hash !== hash(input.accessToken)) throw new StoreError("This checkout attempt was already used. Start a new checkout.",409);
      return { id: previous[0].id, reference: previous[0].reference, repeated: true };
    }
    const settings = await getSettings(tx);
    if (!settings.checkoutEnabled) throw new StoreError("Orders are not open yet.",503);
    if ((input.paymentMethod === "cod" && !settings.codEnabled) || (input.paymentMethod === "bank_transfer" && !settings.bankTransferEnabled)) throw new StoreError("This payment method is not available.");
    if (!settings.serviceCities.some((city) => city.toLowerCase() === input.customer.city.toLowerCase())) throw new StoreError("Delivery isn't available in this city yet.");
    const lines = await resolveLines(tx,input.lines,true); const quote = pricedQuote(lines,settings);
    verifyQuote(input.quoteToken,quote,settings);
    const id = randomUUID(); const reference = `EDIT-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${randomUUID().slice(0,8).toUpperCase()}`;
    const data: OrderData = { customer: input.customer, paymentMethod: input.paymentMethod, lines, subtotalPaisa: quote.subtotalPaisa, shippingPaisa: quote.shippingPaisa, totalPaisa: quote.totalPaisa, bankInstructions: input.paymentMethod === "bank_transfer" ? settings.bankInstructions : "", contactEmail: settings.contactEmail, contactPhone: settings.contactPhone, courier: "", trackingNumber: "", adminNote: "" };
    await tx.query("INSERT INTO edit_store.orders(id,reference,access_hash,request_key,request_hash,data) VALUES($1,$2,$3,$4,$5,$6)",[id,reference,hash(input.accessToken),input.requestKey,requestHash,JSON.stringify(data)]);
    for (const line of lines) {
      await tx.query("UPDATE edit_store.variants SET stock=stock-$2 WHERE id=$1",[line.merchandiseId,line.quantity]);
      await tx.query("UPDATE edit_store.products SET updated_at=now() WHERE id=$1",[line.productId]);
      await tx.query("INSERT INTO edit_store.order_items(order_id,variant_id,quantity) VALUES($1,$2,$3)",[id,line.merchandiseId,line.quantity]);
    }
    await tx.query("INSERT INTO edit_store.order_events(order_id,data) VALUES($1,$2)",[id,JSON.stringify({ status: "pending", note: "Order received; stock reserved." })]);
    for (const kind of ["customer_receipt","owner_alert"]) await tx.query("INSERT INTO edit_store.outbox(id,order_id,kind) VALUES($1,$2,$3)",[randomUUID(),id,kind]);
    return { id, reference, repeated: false };
  });
}

export async function orderReceipt(id: string, token: string) {
  const db = await getStoreDb();
  const { rows } = await db.query<OrderRecord>("SELECT id,reference,status,payment_status,data,created_at,updated_at FROM edit_store.orders WHERE id=$1 AND access_hash=$2",[id,hash(token)]);
  if (!rows.length) throw new StoreError("Order not found. Use the private link provided after checkout.",404);
  const order = rows[0];
  return { id: order.id, reference: order.reference, status: order.status, paymentStatus: order.payment_status, name: order.data.customer.name, city: order.data.customer.city, lines: order.data.lines, subtotalPaisa: order.data.subtotalPaisa, shippingPaisa: order.data.shippingPaisa, totalPaisa: order.data.totalPaisa, paymentMethod: order.data.paymentMethod, bankInstructions: order.data.bankInstructions, courier: order.data.courier, trackingNumber: order.data.trackingNumber, contactEmail: order.data.contactEmail, contactPhone: order.data.contactPhone };
}

export async function updateOrder(id: string, value: { status: OrderStatus; paymentStatus: OrderRecord["payment_status"]; courier: string; trackingNumber: string; adminNote: string }) {
  const db = await getStoreDb();
  return db.transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(749201)");
    const { rows } = await tx.query<OrderRecord>("SELECT * FROM edit_store.orders WHERE id=$1 FOR UPDATE",[id]);
    if (!rows.length) throw new StoreError("Order not found.",404);
    const current = rows[0];
    if (value.status !== current.status && !transitions[current.status].includes(value.status)) throw new StoreError("That order-status change isn't allowed.");
    if (value.status === "shipped" && (!value.courier || !value.trackingNumber)) throw new StoreError("Add the courier and tracking number before marking shipped.");
    if (current.payment_status === "refunded" && value.paymentStatus !== "refunded") throw new StoreError("A refunded order cannot be marked unpaid or paid.");
    if (value.paymentStatus === "refunded" && current.payment_status !== "refund_due" && current.payment_status !== "refunded") throw new StoreError("Mark refund due before recording a completed refund.");
    if (value.paymentStatus === "refund_due" && current.payment_status !== "paid" && current.payment_status !== "refund_due") throw new StoreError("Only a paid order can require a refund.");
    if (current.payment_status === "paid" && value.paymentStatus === "unpaid") throw new StoreError("Record a refund rather than clearing a payment.");
    if (current.data.paymentMethod === "bank_transfer" && value.status !== current.status && ["confirmed","processing","shipped","delivered"].includes(value.status) && value.paymentStatus !== "paid") throw new StoreError("Confirm receipt of the bank transfer before processing this order.");
    if (value.status === "delivered" && current.status !== "delivered" && value.paymentStatus !== "paid") throw new StoreError("Record payment before marking an order delivered.");
    const paymentStatus = value.status === "cancelled" && value.paymentStatus === "paid" ? "refund_due" : value.paymentStatus;
    if (value.status === "cancelled" && current.status !== "cancelled") {
      const { rows: items } = await tx.query<{ variant_id: string; quantity: number }>("SELECT variant_id,quantity FROM edit_store.order_items WHERE order_id=$1 ORDER BY variant_id",[id]);
      for (const item of items) {
        await tx.query("UPDATE edit_store.variants SET stock=stock+$2 WHERE id=$1",[item.variant_id,item.quantity]);
        await tx.query("UPDATE edit_store.products SET updated_at=now() WHERE id=(SELECT product_id FROM edit_store.variants WHERE id=$1)",[item.variant_id]);
      }
    }
    const data = { ...current.data, courier: value.courier, trackingNumber: value.trackingNumber, adminNote: value.adminNote };
    await tx.query("UPDATE edit_store.orders SET status=$2,payment_status=$3,data=$4,updated_at=now() WHERE id=$1",[id,value.status,paymentStatus,JSON.stringify(data)]);
    await tx.query("INSERT INTO edit_store.order_events(order_id,data) VALUES($1,$2)",[id,JSON.stringify({ status: value.status, paymentStatus, note: value.adminNote || "Updated by store owner." })]);
    return { ...current, status: value.status, payment_status: paymentStatus, data };
  });
}

export function priceText(paisa: number) { return `PKR ${Number(amount(paisa)).toLocaleString("en-PK")}`; }
