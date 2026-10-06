import { randomUUID } from "node:crypto";
import { getStoreDb } from "../lib/store/database";
import { mockProducts } from "../lib/commerce/mock-data";
import { defaultSettings } from "../lib/store/validation";
import { saveProduct } from "../lib/store/catalogue";

if (!process.env.STORE_DEVELOPMENT_DB || process.env.DATABASE_URL || process.env.VERCEL || process.env.NODE_ENV === "production") throw new Error("Demo data is allowed only in the local development database.");
const db = await getStoreDb();
for (const product of mockProducts) {
  const existing = await db.query("SELECT id FROM edit_store.products WHERE handle=$1",[product.handle]);
  if (existing.rows.length) continue;
  await saveProduct({ handle: product.handle, title: product.title, status: "draft", productType: product.productType, vendor: product.vendor, description: product.description, tags: product.tags, images: [{ url: "https://example.com/replace-with-real-product.jpg", altText: "Replace this demo image" }], collectionHandles: product.collectionHandles, editorial: product.editorial, variants: product.variants.map((v) => ({ title: v.title, price: v.price.amount, stock: 0, sku: `DEMO-${randomUUID().slice(0,8)}` })) });
}
await db.query("UPDATE edit_store.settings SET data=$1 WHERE id=1",[JSON.stringify(defaultSettings)]);
console.log("Local draft examples added. Replace all imagery, claims and prices before selling. No checkout was enabled.");
process.exit(0);
