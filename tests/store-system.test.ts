import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, scryptSync } from "node:crypto";
import { getStoreDb } from "../lib/store/database";
import { saveProduct, listProducts } from "../lib/store/catalogue";
import { sendQueuedEmails } from "../lib/store/email";
import { placeOrder, quoteBag, orderReceipt, updateOrder } from "../lib/store/orders";
import { defaultSettings, productSchema, settingsSchema, type ProductInput } from "../lib/store/validation";
import { hash, validSession, createSession, passwordMatches, requireSameOrigin, rateLimit } from "../lib/store/security";

process.env.STORE_DEVELOPMENT_DB = "memory";
process.env.ADMIN_SESSION_SECRET = randomBytes(48).toString("hex");
const salt = randomBytes(16).toString("hex"); const password = "a-test-password-long-enough";
process.env.ADMIN_PASSWORD_HASH = `${salt}:${scryptSync(password,salt,64).toString("hex")}`;
const settings = { ...defaultSettings, checkoutEnabled: true, codEnabled: true, bankTransferEnabled: true, bankInstructions: "Test account only", shippingFee: 250, freeShippingAbove: 5000, serviceCities: ["Lahore"], contactEmail: "store@example.com", contactPhone: "03001234567", deliveryPolicy: "Test delivery policy.", returnPolicy: "Test return policy.", privacyPolicy: "Test privacy policy." };
const input = (stock = 3): ProductInput => ({ title: "Test card holder", handle: `test-${randomUUID()}`, status: "active", productType: "Wallet", vendor: "The Edit", description: "A real test of the catalogue and checkout workflow.", images: [{ url: "https://example.com/product.jpg", altText: "Test object" }], tags: [], collectionHandles: ["current-edit"], variants: [{ title: "Black", price: "1500.50", sku: "TEST", stock }], editorial: { curationNote: "Chosen for a test.", materials: ["Leather"], dimensions: "10 cm", fulfillmentModel: "in_stock", dispatchEstimate: "2 working days", caveats: [], restrictionStatus: "none" } });
const customer = { name: "Test Customer", email: "customer@example.com", phone: "03001234567", address: "House 1, Test Street, Lahore", city: "Lahore", postalCode: "54000", notes: "" };
async function checkout(variantId: string, quantity = 1) { const lines = [{ merchandiseId: variantId, quantity }]; const quote = await quoteBag(lines); return { requestKey: randomUUID(), accessToken: randomBytes(32).toString("hex"), quoteToken: quote.quoteToken, lines, customer, paymentMethod: "cod" as const, acceptedPolicies: true as const, website: "" }; }

test("independent commerce: real transaction and security invariants", async (t) => {
  const db = await getStoreDb();
  await db.query("UPDATE edit_store.settings SET data=$1 WHERE id=1",[JSON.stringify(settings)]);
  await t.test("owner credentials, session tampering, expiry and credential rotation", () => {
    assert.ok(passwordMatches(password)); assert.equal(passwordMatches("wrong"),false);
    const session = createSession(); assert.ok(validSession(session)); assert.equal(validSession(session+"f"),false); assert.equal(validSession(`1000000000000.${"a".repeat(32)}.${"b".repeat(64)}`),false);
    const previous = process.env.ADMIN_PASSWORD_HASH; process.env.ADMIN_PASSWORD_HASH += "changed"; assert.equal(validSession(session),false); process.env.ADMIN_PASSWORD_HASH = previous;
  });
  await t.test("cross-origin mutations and untrusted image URLs are rejected", () => {
    assert.throws(() => requireSameOrigin(new Request("https://store.example/api",{ headers: { origin: "https://evil.example" } })));
    assert.doesNotThrow(() => requireSameOrigin(new Request("https://store.example/api",{ headers: { origin: "https://store.example" } })));
    assert.equal(productSchema.safeParse({ ...input(), images: [{ url: "javascript:alert(1)", altText: "" }] }).success,false);
    assert.equal(settingsSchema.safeParse({ ...defaultSettings, checkoutEnabled: true }).success,false);
  });
  await t.test("server prices, duplicate submissions, private receipt and one-time restock", async () => {
    const product = await saveProduct(input()); const variant = product.data.variants[0].id!;
    const payload = await checkout(variant,2); const result = await placeOrder({ ...payload, totalPaisa: 1 });
    const duplicate = await placeOrder(payload); assert.equal(duplicate.id,result.id); assert.equal(duplicate.repeated,true);
    const receipt = await orderReceipt(result.id,payload.accessToken); assert.equal(receipt.totalPaisa,325100); assert.equal(receipt.status,"pending");
    await assert.rejects(orderReceipt(result.id,randomBytes(32).toString("hex")));
    await assert.rejects(placeOrder({ ...payload, customer: { ...customer, name: "Other" } }));
    assert.equal((await db.query<{ stock: number }>("SELECT stock FROM edit_store.variants WHERE id=$1",[variant])).rows[0].stock,1);
    const change = { status: "cancelled" as const, paymentStatus: "unpaid" as const, courier: "", trackingNumber: "", adminNote: "Cancelled test" };
    await updateOrder(result.id,change); await updateOrder(result.id,change);
    assert.equal((await db.query<{ stock: number }>("SELECT stock FROM edit_store.variants WHERE id=$1",[variant])).rows[0].stock,3);
    await assert.rejects(updateOrder(result.id,{ ...change, status: "confirmed" }));
  });
  await t.test("concurrent checkout cannot oversell the last item", async () => {
    const product = await saveProduct(input(1)); const variant = product.data.variants[0].id!;
    const a = await checkout(variant); const b = await checkout(variant);
    const result = await Promise.allSettled([placeOrder(a),placeOrder(b)]);
    assert.equal(result.filter((r) => r.status === "fulfilled").length,1);
    assert.equal((await db.query<{ stock: number }>("SELECT stock FROM edit_store.variants WHERE id=$1",[variant])).rows[0].stock,0);
  });
  await t.test("price changes require a new quote and stale admin edits cannot overwrite stock", async () => {
    const product = await saveProduct(input(5)); const variant = product.data.variants[0].id!; const payload = await checkout(variant);
    const updated = await saveProduct({ ...product.data, variants: [{ ...product.data.variants[0], price: "1700" }] });
    await assert.rejects(placeOrder(payload),/changed/);
    const next = await checkout(variant); await placeOrder(next);
    await assert.rejects(saveProduct(updated.data),/changed/);
    const current = (await listProducts(true)).find((p) => p.id === product.id)!;
    assert.equal(current.data.variants[0].stock,4);
  });
  await t.test("bank transfer must be verified before fulfilment, tracking required", async () => {
    const product = await saveProduct(input()); const payload = await checkout(product.data.variants[0].id!); const order = await placeOrder({ ...payload, paymentMethod: "bank_transfer" });
    const change = { status: "confirmed" as const, paymentStatus: "unpaid" as const, courier: "", trackingNumber: "", adminNote: "" };
    await assert.rejects(updateOrder(order.id,change),/bank transfer/);
    await updateOrder(order.id,{ ...change, paymentStatus: "paid" });
    await updateOrder(order.id,{ ...change, status: "processing", paymentStatus: "paid" });
    await assert.rejects(updateOrder(order.id,{ ...change, status: "shipped", paymentStatus: "paid" }),/tracking/);
    await updateOrder(order.id,{ ...change, status: "shipped", paymentStatus: "paid", courier: "Test Courier", trackingNumber: "123456" });
    await updateOrder(order.id,{ ...change, status: "delivered", paymentStatus: "paid", courier: "Test Courier", trackingNumber: "123456" });
    await updateOrder(order.id,{ ...change, status: "delivered", paymentStatus: "refund_due", courier: "Test Courier", trackingNumber: "123456" });
    await updateOrder(order.id,{ ...change, status: "delivered", paymentStatus: "refunded", courier: "Test Courier", trackingNumber: "123456" });
  });
  await t.test("draft, retired, restricted and unsupported-city purchases are blocked", async () => {
    const product = await saveProduct({ ...input(), status: "draft" }); await assert.rejects(quoteBag([{ merchandiseId: product.data.variants[0].id, quantity: 1 }]));
    const restricted = await saveProduct({ ...input(), editorial: { ...input().editorial, restrictionStatus: "review_before_launch" } }); await assert.rejects(quoteBag([{ merchandiseId: restricted.data.variants[0].id, quantity: 1 }]));
    const active = await saveProduct(input()); const payload = await checkout(active.data.variants[0].id!); await assert.rejects(placeOrder({ ...payload, customer: { ...customer, city: "Unsupported City" } }));
    await assert.rejects(quoteBag([{ merchandiseId: active.data.variants[0].id, quantity: 21 }]));
  });
  await t.test("email outbox keeps failures and sends each successful notification once", async () => {
    const originalFetch = globalThis.fetch;
    process.env.RESEND_API_KEY = "local-test-only"; process.env.STORE_EMAIL_FROM = "store@example.com";
    try {
      globalThis.fetch = async () => new Response("Service unavailable",{ status: 503 });
      assert.equal((await sendQueuedEmails()).sent,0);
      assert.equal((await sendQueuedEmails()).sent,0); // Backoff prevents immediate repeated sends.
      await db.query("UPDATE edit_store.outbox SET last_attempt_at=NULL");
      const sent: string[] = [];
      globalThis.fetch = async (_url, options) => { const id = (options?.headers as Record<string,string>)["Idempotency-Key"]; sent.push(id); return Response.json({ id: randomUUID() }); };
      assert.ok((await sendQueuedEmails()).sent > 0);
      assert.equal((await sendQueuedEmails()).sent,0);
      assert.equal(new Set(sent).size,sent.length);
    } finally { globalThis.fetch = originalFetch; delete process.env.RESEND_API_KEY; delete process.env.STORE_EMAIL_FROM; }
  });
  await t.test("rate limits persist in the database", async () => { const key = `test:${hash(randomUUID())}`; await rateLimit(key,2,60); await rateLimit(key,2,60); await assert.rejects(rateLimit(key,2,60),/Too many/); });
});
