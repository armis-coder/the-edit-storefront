import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import sharp from "sharp";

// Isolated local database and generated test credentials. Never touches production.
const origin = "http://127.0.0.1:3140";
const password = randomBytes(24).toString("hex");
const salt = randomBytes(16).toString("hex");
const server = spawn(process.execPath,["node_modules/next/dist/bin/next","dev","--hostname","127.0.0.1","--port","3140"],{
  env: { ...process.env, NODE_ENV: "development", VERCEL: "", COMMERCE_PROVIDER: "independent", DATABASE_URL: "", STORE_DEVELOPMENT_DB: "memory", SITE_URL: origin, ADMIN_EMAIL: "owner@example.com", ADMIN_PASSWORD_HASH: `${salt}:${scryptSync(password,salt,64).toString("hex")}`, ADMIN_SESSION_SECRET: randomBytes(48).toString("hex"), RESEND_API_KEY: "", STORE_EMAIL_FROM: "" },
  stdio: ["ignore","pipe","pipe"],
});
let output = ""; let cookie = "";
server.stdout.on("data",(chunk) => { output = (output+chunk).slice(-20000); });
server.stderr.on("data",(chunk) => { output = (output+chunk).slice(-20000); });
async function api(path,method = "GET",body,expected = 200,authenticated = true) {
  const response = await fetch(origin+path,{ method, headers: { Origin: origin, ...(body ? { "Content-Type": "application/json" } : {}), ...(authenticated && cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000) });
  const result = await response.json();
  assert.equal(response.status,expected,`${method} ${path}: ${result.error ?? response.status}`);
  return { result, response };
}
try {
  for(let n=0;!output.includes("Ready");n++) { if(n>200 || server.exitCode !== null) throw new Error(`Server did not start: ${output}`); await delay(100); }
  await api("/api/admin/products","GET",undefined,401,false);
  const crossOrigin = await fetch(origin+"/api/admin/session",{ method: "POST", headers: { Origin: "https://wrong.example", "Content-Type": "application/json" }, body: JSON.stringify({ email: "owner@example.com",password }) });
  assert.equal(crossOrigin.status,403);
  assert.equal((await api("/api/store/config")).result.checkoutEnabled,false);
  const login = await api("/api/admin/session","POST",{ email: "owner@example.com",password });
  cookie = login.response.headers.get("set-cookie").split(";")[0];
  assert.match(login.response.headers.get("set-cookie"),/HttpOnly/i);
  assert.match(login.response.headers.get("set-cookie"),/SameSite=strict/i);
  console.log("Owner session and cross-origin protections verified");

  const image = await sharp({ create: { width: 32,height: 32,channels: 3,background: "#121619" } }).png().toBuffer();
  const form = new FormData(); form.set("image",new Blob([image],{ type: "image/png" }),"test.png");
  const upload = await fetch(origin+"/api/admin/media",{ method: "POST",headers: { Origin: origin,Cookie: cookie },body: form });
  assert.equal(upload.status,200,await upload.clone().text());
  const { url } = await upload.json();
  const media = await fetch(origin+url); assert.equal(media.status,200); assert.equal(media.headers.get("content-type"),"image/webp");
  const product = (await api("/api/admin/products","POST",{ title: "Integration card holder",handle: "integration-card-holder",status: "active",productType: "Wallet",vendor: "The Edit",description: "Local integration test object, never published to production.",images: [{ url,altText: "Local test image" }],tags: [],collectionHandles: ["current-edit"],variants: [{ title: "Black",sku: "TEST",price: "1500.50",stock: 3 }],editorial: { curationNote: "Selected for a local test.",materials: ["Leather"],dimensions: "10 cm",fulfillmentModel: "in_stock",dispatchEstimate: "Test only",caveats: [],restrictionStatus: "none" } })).result.product;
  const settings = (await api("/api/admin/settings")).result.settings;
  await api("/api/admin/settings","POST",{ ...settings,checkoutEnabled: true },400);
  await api("/api/admin/settings","POST",{ ...settings,checkoutEnabled: true,codEnabled: true,shippingFee: 250,serviceCities: ["Lahore"],contactEmail: "store@example.com",contactPhone: "03001234567",deliveryPolicy: "Local test delivery policy",returnPolicy: "Local test returns policy",privacyPolicy: "Local test privacy policy" });
  const lines = [{ merchandiseId: product.data.variants[0].id,quantity: 2 }];
  const quote = (await api("/api/store/quote","POST",lines)).result;
  assert.equal(quote.totalPaisa,325100);
  const accessToken = randomBytes(32).toString("hex");
  const orderInput = { requestKey: randomUUID(),accessToken,quoteToken: quote.quoteToken,lines,customer: { name: "Local Test",email: "customer@example.com",phone: "03001234567",address: "House 1, Local Test Street",city: "Lahore",postalCode: "54000",notes: "" },paymentMethod: "cod",acceptedPolicies: true,website: "" };
  const order = (await api("/api/store/orders","POST",orderInput,201)).result;
  assert.equal((await api("/api/store/orders","POST",orderInput)).result.id,order.id);
  await api(`/api/store/orders/${order.id}`,"POST",{ token: randomBytes(32).toString("hex") },404,false);
  const receipt = (await api(`/api/store/orders/${order.id}`,"POST",{ token: accessToken },200,false)).result;
  assert.equal(receipt.totalPaisa,325100); assert.equal(receipt.email,undefined); assert.equal(receipt.address,undefined);
  let list = (await api("/api/admin/products")).result.products;
  assert.equal(list[0].data.variants[0].stock,1);
  await api("/api/admin/orders","POST",{ id: order.id,status: "cancelled",paymentStatus: "unpaid",courier: "",trackingNumber: "",adminNote: "Local test complete" });
  list = (await api("/api/admin/products")).result.products;
  assert.equal(list[0].data.variants[0].stock,3);
  console.log("Image upload, server totals, idempotency, private receipt and stock restoration verified");
  for(const path of ["/","/collections/current-edit","/products/integration-card-holder","/search?q=integration","/checkout",`/orders/${order.id}`,"/admin","/policies/privacy","/contact"]) {
    const response = await fetch(origin+path,{ signal: AbortSignal.timeout(60000) }); assert.equal(response.status,200,path); await response.text();
  }
  await api("/api/store/subscribe","POST",{ email: "subscriber@example.com",consent: true });
  await api("/api/admin/session","DELETE"); cookie = "";
  await api("/api/admin/orders","GET",undefined,401);
  console.log("9 independent store pages, newsletter persistence and logout access protection verified");
} catch(error) { console.error(error); console.error(output.slice(-5000)); process.exitCode = 1; }
finally { server.kill("SIGTERM"); }
