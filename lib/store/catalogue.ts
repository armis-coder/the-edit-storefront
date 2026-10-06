import { randomUUID } from "node:crypto";
import type { Product, Collection } from "../commerce/types";
import type { Database } from "./database";
import { getStoreDb } from "./database";
import { amount, paisa, productSchema, StoreError, type ProductInput, type StoreSettings } from "./validation";

export type ProductRecord = { id: string; handle: string; status: ProductInput["status"]; data: ProductInput; revision: string };
type VariantRecord = { id: string; product_id: string; price_paisa: number; stock: number };
export async function getSettings(db?: Database): Promise<StoreSettings> { return (await (db ?? await getStoreDb()).query<{ data: StoreSettings }>("SELECT data FROM edit_store.settings WHERE id=1")).rows[0].data; }

export async function listProducts(admin = false, db?: Database): Promise<ProductRecord[]> {
  const connection = db ?? await getStoreDb();
  const records = (await connection.query<ProductRecord>(`SELECT id,handle,status,data,updated_at::text AS revision FROM edit_store.products ${admin ? "" : "WHERE status='active'"} ORDER BY updated_at DESC LIMIT 500`)).rows;
  if (admin) {
    const { rows } = await connection.query<VariantRecord>("SELECT * FROM edit_store.variants");
    return records.map((record) => ({ ...record, data: { ...record.data, revision: record.revision, variants: record.data.variants.map((variant) => { const current = rows.find((v) => v.id === variant.id); return { ...variant, stock: current?.stock ?? 0, price: amount(current?.price_paisa ?? paisa(variant.price)) }; }) } }));
  }
  return records;
}
export async function publicProducts(): Promise<Product[]> {
  const db = await getStoreDb();
  const [products, { rows: variants }] = await Promise.all([listProducts(false, db), db.query<VariantRecord>("SELECT id,product_id,price_paisa,stock FROM edit_store.variants")]);
  return products.map(({ id, data }) => {
    const options = data.variants.length > 1 || data.variants[0].title !== "Default" ? [{ name: "Option", values: data.variants.map((v) => v.title) }] : [];
    const mapped = data.variants.map((variant) => {
      const record = variants.find((v) => v.id === variant.id && v.product_id === id);
      return { id: variant.id!, title: variant.title, availableForSale: !!record && record.stock > 0 && data.editorial.restrictionStatus === "none", quantityAvailable: record?.stock ?? 0, selectedOptions: options.length ? [{ name: "Option", value: variant.title }] : [], price: { amount: amount(record?.price_paisa ?? paisa(variant.price)), currencyCode: "PKR" } };
    });
    const featured = data.images[0] ?? { url: "/product-sprite.png", altText: data.title };
    return { id, handle: data.handle, title: data.title, productType: data.productType, vendor: data.vendor, description: data.description, tags: data.tags, featuredImage: featured, images: data.images.length ? data.images : [featured], options, variants: mapped, availableForSale: mapped.some((v) => v.availableForSale), collectionHandles: data.collectionHandles.filter((h) => h !== "under-3000" || mapped.every((v) => Number(v.price.amount) < 3000)), editorial: data.editorial, seo: { title: `${data.title} | The Edit`, description: data.description.slice(0, 160) } };
  });
}
export async function publicCollections(): Promise<Collection[]> {
  const db = await getStoreDb();
  const [products, { rows }] = await Promise.all([publicProducts(), db.query<{ handle: string; data: { title: string; description: string } }>("SELECT handle,data FROM edit_store.collections ORDER BY handle")]);
  return rows.map((row, index) => { const members = products.filter((p) => p.collectionHandles.includes(row.handle)); return { id: row.handle, handle: row.handle, title: row.data.title, description: row.data.description, note: `${members.length} objects`, index: String(index).padStart(2, "0"), image: members[0]?.featuredImage ?? { url: "/product-sprite.png", altText: row.data.title }, products: members }; });
}

export async function saveProduct(value: unknown) {
  const input = productSchema.parse(value);
  const db = await getStoreDb();
  return db.transaction(async (tx) => {
    // Shared lock order with checkout: catalogue lock, then variant locks.
    await tx.query("SELECT pg_advisory_xact_lock(749201)");
    const id = input.id ?? randomUUID();
    const { rows: old } = await tx.query<ProductRecord>("SELECT id,handle,status,data,updated_at::text AS revision FROM edit_store.products WHERE id=$1 FOR UPDATE", [id]);
    if (input.id && !old.length) throw new StoreError("Product no longer exists.", 404);
    if (input.id && input.revision !== old[0].revision) throw new StoreError("This product or its stock changed while you were editing. Reload it before saving.", 409);
    const { rows: existingVariants } = await tx.query<VariantRecord>("SELECT * FROM edit_store.variants WHERE product_id=$1 ORDER BY id FOR UPDATE", [id]);
    if (input.variants.some((v) => v.id && !existingVariants.some((r) => r.id === v.id))) throw new StoreError("An option does not belong to this product.");
    const data: ProductInput = { ...input, id, variants: input.variants.map((v) => ({ ...v, id: v.id ?? randomUUID() })) };
    await tx.query("INSERT INTO edit_store.products(id,handle,status,data) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET handle=EXCLUDED.handle,status=EXCLUDED.status,data=EXCLUDED.data,updated_at=now()", [id, data.handle, data.status, JSON.stringify(data)]);
    for (const variant of data.variants) await tx.query("INSERT INTO edit_store.variants(id,product_id,price_paisa,stock) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET price_paisa=EXCLUDED.price_paisa,stock=EXCLUDED.stock", [variant.id, id, paisa(variant.price), variant.stock]);
    // Retain retired variants for order history; they can no longer be purchased.
    for (const oldVariant of existingVariants) if (!data.variants.some((v) => v.id === oldVariant.id)) await tx.query("UPDATE edit_store.variants SET stock=0 WHERE id=$1", [oldVariant.id]);
    const { rows: saved } = await tx.query<{ revision: string }>("SELECT updated_at::text AS revision FROM edit_store.products WHERE id=$1",[id]);
    return { id, handle: data.handle, status: data.status, data: { ...data, revision: saved[0].revision }, revision: saved[0].revision };
  });
}
