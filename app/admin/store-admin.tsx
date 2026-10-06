"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { initialCollections, defaultSettings, type ProductInput, type StoreSettings } from "@/lib/store/validation";
import type { ProductRecord } from "@/lib/store/catalogue";
import type { OrderRecord } from "@/lib/store/orders";

type Tab = "orders" | "products" | "settings" | "subscribers";
const freshProduct = (): ProductInput => ({ handle: "", title: "", status: "draft", productType: "Accessory", vendor: "The Edit", description: "", images: [], collectionHandles: ["current-edit"], tags: [], variants: [{ title: "Default", price: "", sku: "", stock: 0 }], editorial: { curationNote: "", materials: [], dimensions: "", fulfillmentModel: "in_stock", dispatchEstimate: "", caveats: [], careInstructions: "", restrictionStatus: "none" } });
async function api(path: string, body?: unknown, method = "POST") {
  const response = await fetch(`/api/admin/${path}`, { method: body === undefined && method === "POST" ? "GET" : method, headers: body === undefined ? {} : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Request failed."); return result;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="system-field"><span>{label}</span>{children}</label>; }
function money(paisa: number) { return `PKR ${(paisa / 100).toLocaleString("en-PK")}`; }

export function AdminDesk({ signedIn }: { signedIn: boolean }) {
  const [authenticated, setAuthenticated] = useState(signedIn);
  const [tab, setTab] = useState<Tab>("orders");
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [moreOrders, setMoreOrders] = useState(false);
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [subscribers, setSubscribers] = useState<Array<{ email: string; created_at: string }>>([]);
  const [editing, setEditing] = useState<ProductInput | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [notice, setNotice] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(signedIn);
  const [health, setHealth] = useState<{ emailConfigured: boolean; pendingEmails: string } | null>(null);
  const load = useCallback(async (target: Tab) => {
    setBusy(true); setError("");
    try { const [result,currentHealth] = await Promise.all([api(target),api("health")]); if (target === "products") setProducts(result.products); if (target === "orders") { setOrders(result.orders); setMoreOrders(result.more); } if (target === "settings") setSettings(result.settings); if (target === "subscribers") setSubscribers(result.subscribers); setHealth(currentHealth); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }, []);
  useEffect(() => {
    if(!authenticated) return;
    let active = true;
    Promise.all([api(tab),api("health")]).then(([result,currentHealth]) => {
      if(!active) return;
      if(tab === "products") setProducts(result.products);
      if(tab === "orders") { setOrders(result.orders); setMoreOrders(result.more); }
      if(tab === "settings") setSettings(result.settings);
      if(tab === "subscribers") setSubscribers(result.subscribers);
      setHealth(currentHealth);
    }).catch((error) => { if(active) setError(error.message); }).finally(() => { if(active) setBusy(false); });
    return () => { active = false; };
  },[authenticated,tab]);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); const form = new FormData(event.currentTarget);
    try { await api("session", { email: form.get("email"), password: form.get("password") }); setAuthenticated(true); }
    catch(e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function save(path: string, body: unknown) {
    setBusy(true); setError(""); setNotice("");
    try { const result = await api(path, body); setNotice("Changes saved."); return result; }
    catch(e) { setError((e as Error).message); return null; } finally { setBusy(false); }
  }
  if (!authenticated) return <main className="system-page system-login"><Link className="system-brand" href="/">THE / EDIT</Link><div className="system-panel"><p className="system-kicker">OWNER ACCESS</p><h1>Your store desk.</h1><p>Manage the catalogue, review orders and control when checkout opens.</p><form onSubmit={login}><Field label="Owner email"><input name="email" type="email" autoComplete="username" required /></Field><Field label="Password"><input name="password" type="password" autoComplete="current-password" required /></Field><button className="system-button" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></form>{error && <p role="alert" className="system-error">{error}</p>}<small>Owner credentials and the database must be configured before sign-in.</small></div></main>;

  return <main className="system-page admin-page">
    <header className="system-topbar"><Link className="system-brand" href="/">THE / EDIT</Link><span>STORE DESK</span><button onClick={async () => { try { await api("session", undefined, "DELETE"); setAuthenticated(false); setProducts([]); setOrders([]); setSubscribers([]); setSelectedOrder(null); setEditing(null); } catch(e) { setError((e as Error).message); } }}>Sign out</button></header>
    <div className="admin-shell"><aside className="admin-navigation"><p className="system-kicker">OPERATIONS</p>{(["orders","products","settings","subscribers"] as Tab[]).map((item) => <button key={item} className={tab === item ? "selected" : ""} onClick={() => { setTab(item); setEditing(null); setSelectedOrder(null); setNotice(""); }}>{item === "settings" ? "Store settings" : item[0].toUpperCase()+item.slice(1)}</button>)}<Link href="/">View storefront ↗</Link>{health && <div className="admin-health"><span>Database connected</span><span>{health.emailConfigured ? "Email configured" : "Email setup needed"}</span><span>{health.pendingEmails} queued emails</span><button disabled={busy || !health.emailConfigured} onClick={async () => { const result = await save("email-retry",{}); if(result) { setNotice(`${result.sent} emails sent.`); setHealth(await api("health")); } }}>Retry queued emails</button></div>}</aside>
    <section className="admin-content"><div className="admin-heading"><div><p className="system-kicker">THE / EDIT — OPERATIONS</p><h1>{tab === "settings" ? "Store settings" : tab[0].toUpperCase()+tab.slice(1)}</h1></div><button className="system-secondary" disabled={busy} onClick={() => { setEditing(null); setSelectedOrder(null); void load(tab); }}>Refresh</button></div>
      {error && <p className="system-error" role="alert">{error}</p>}{notice && <p className="system-success" role="status">{notice}</p>}{busy && <p className="system-muted" role="status">Working…</p>}

      {tab === "products" && !editing && <><div className="admin-tools"><p>{products.length} products · publish only verified items</p><button className="system-button" onClick={() => setEditing(freshProduct())}>Add product</button></div><div className="admin-list">{products.map((p) => <button className="admin-list-row" key={p.id} onClick={() => setEditing(structuredClone(p.data))}><span><strong>{p.data.title}</strong><small>/{p.handle} · {p.data.variants.length} options</small></span><span className={`status-pill ${p.status}`}>{p.status}</span></button>)}{!products.length && <div className="system-empty"><h2>Your catalogue starts here.</h2><p>Add a real product with its image, price, stock and dispatch details. New products start as drafts.</p></div>}</div></>}
      {tab === "products" && editing && <ProductEditor value={editing} onChange={setEditing} busy={busy} onCancel={() => setEditing(null)} onSave={async () => { const result = await save("products",editing); if(result) { setEditing(null); await load("products"); } }} />}

      {tab === "orders" && !selectedOrder && <><p className="system-muted">Confirm availability, prepare the order, then record courier tracking. Stock is reserved when an order is placed.</p><div className="admin-list">{orders.map((order) => <button className="admin-list-row" key={order.id} onClick={() => setSelectedOrder(structuredClone(order))}><span><strong>{order.reference}</strong><small>{order.data.customer.name} · {order.data.customer.city} · {new Date(order.created_at).toLocaleString("en-PK")}</small></span><span>{money(order.data.totalPaisa)}<small>{order.data.paymentMethod === "cod" ? "Cash on delivery" : "Bank transfer"} · {order.payment_status}</small></span><span className="status-pill">{order.status}</span></button>)}{!orders.length && <div className="system-empty"><h2>No orders yet.</h2><p>Orders appear here after checkout is opened in Store settings.</p></div>}</div>{moreOrders && <button className="system-secondary" disabled={busy} onClick={async () => { setBusy(true); try { const result = await api(`orders?before=${encodeURIComponent(new Date(orders.at(-1)!.created_at).toISOString())}`); setOrders((current) => [...current,...result.orders]); setMoreOrders(result.more); } catch(e) { setError((e as Error).message); } finally { setBusy(false); } }}>Load older orders</button>}</>}
      {tab === "orders" && selectedOrder && <OrderEditor order={selectedOrder} onChange={setSelectedOrder} busy={busy} onCancel={() => setSelectedOrder(null)} onSave={async () => { const order = selectedOrder; const result = await save("orders",{ id: order.id, status: order.status, paymentStatus: order.payment_status, courier: order.data.courier, trackingNumber: order.data.trackingNumber, adminNote: order.data.adminNote }); if(result) { setSelectedOrder(result.order); await load("orders"); } }} />}
      {tab === "settings" && <SettingsEditor value={settings} onChange={setSettings} busy={busy} onSave={async () => { await save("settings",settings); }} />}
      {tab === "subscribers" && <><p className="system-muted">People who explicitly signed up for collection updates. No campaigns are sent automatically.</p><div className="admin-list">{subscribers.map((s) => <div className="admin-list-row" key={s.email}><span>{s.email}</span><small>{new Date(s.created_at).toLocaleDateString("en-PK")}</small></div>)}{!subscribers.length && <p className="system-empty">No sign-ups yet.</p>}</div></>}
    </section></div>
  </main>;
}

function ProductEditor({ value: p, onChange, busy, onCancel, onSave }: { value: ProductInput; onChange: (value: ProductInput) => void; busy: boolean; onCancel: () => void; onSave: () => Promise<void> }) {
  const [uploading,setUploading] = useState(false); const [uploadError,setUploadError] = useState("");
  const update = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => onChange({ ...p, [key]: value });
  const editorial = <K extends keyof ProductInput["editorial"]>(key: K, value: ProductInput["editorial"][K]) => update("editorial",{ ...p.editorial, [key]: value });
  return <form className="system-form" onSubmit={(e) => { e.preventDefault(); void onSave(); }}><div className="system-form-grid">
    <Field label="Product title"><input required value={p.title} onChange={(e) => { update("title",e.target.value); }} /></Field>
    <Field label="URL handle"><input required placeholder="leather-card-holder" value={p.handle} onChange={(e) => update("handle",e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,""))} /></Field>
    <Field label="Status"><select value={p.status} onChange={(e) => update("status",e.target.value as ProductInput["status"])}><option value="draft">Draft — hidden</option><option value="active">Active — visible</option><option value="archived">Archived — hidden</option></select></Field>
    <Field label="Product type"><input required value={p.productType} onChange={(e) => update("productType",e.target.value)} /></Field>
    <Field label="Vendor / brand"><input required value={p.vendor} onChange={(e) => update("vendor",e.target.value)} /></Field>
    <Field label="Tags (comma separated)"><input value={p.tags.join(", ")} onChange={(e) => update("tags",e.target.value.split(",").map((v) => v.trim()))} /></Field>
  </div><Field label="Description"><textarea required minLength={10} rows={4} value={p.description} onChange={(e) => update("description",e.target.value)} /></Field>
  <Field label="Upload a product image"><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading || p.images.length>=8} onChange={async (e) => { const file=e.target.files?.[0]; if(!file) return; setUploading(true); setUploadError(""); try { const data=new FormData(); data.set("image",file); const response=await fetch("/api/admin/media",{ method: "POST", body: data }); const result=await response.json(); if(!response.ok) throw new Error(result.error); update("images",[...p.images,{ url: result.url, altText: p.title }]); } catch(error) { setUploadError((error as Error).message); } finally { setUploading(false); e.target.value=""; } }} /></Field>
  {uploading && <p role="status">Optimising and uploading image…</p>}{uploadError && <p className="system-error" role="alert">{uploadError}</p>}
  <Field label="Product images (one uploaded path or HTTPS URL per line)"><textarea rows={3} placeholder="https://…/product.jpg" value={p.images.map((image) => image.url).join("\n")} onChange={(e) => update("images",e.target.value.split("\n").filter(Boolean).map((url) => ({ url, altText: p.title })))} /></Field>
  <fieldset className="system-fieldset"><legend>Collections</legend><div className="system-checkboxes">{initialCollections.map((c) => <label key={c.handle}><input type="checkbox" checked={p.collectionHandles.includes(c.handle)} onChange={(e) => update("collectionHandles",e.target.checked ? [...p.collectionHandles,c.handle] : p.collectionHandles.filter((h) => h !== c.handle))} />{c.title}</label>)}</div></fieldset>
  <fieldset className="system-fieldset"><legend>Options, prices and available stock</legend><p className="system-muted">Stock is the quantity available to promise. New orders deduct it immediately.</p>{p.variants.map((v,i) => <div className="admin-variant" key={v.id ?? i}>{(["title","price","sku","stock"] as const).map((key) => <Field key={key} label={{ title: "Option name", price: "Price · PKR", sku: "SKU", stock: "Stock" }[key]}><input required={key !== "sku"} type={key === "stock" ? "number" : "text"} min={0} step={1} inputMode={key === "price" ? "decimal" : undefined} value={v[key]} onChange={(e) => update("variants",p.variants.map((variant,index) => index === i ? { ...variant, [key]: key === "stock" ? Number(e.target.value) : e.target.value } : variant))} /></Field>)}<button type="button" disabled={p.variants.length === 1} onClick={() => update("variants",p.variants.filter((_,index) => index !== i))}>Remove</button></div>)}<button className="system-secondary" type="button" onClick={() => update("variants",[...p.variants,{ title: "", price: "", sku: "", stock: 0 }])}>Add option</button></fieldset>
  <div className="system-form-grid"><Field label="Fulfilment model"><select value={p.editorial.fulfillmentModel} onChange={(e) => editorial("fulfillmentModel",e.target.value as ProductInput["editorial"]["fulfillmentModel"])}><option value="in_stock">Held locally</option><option value="supplier_fulfilled">Supplier fulfilled</option><option value="preorder">Pre-order</option></select></Field><Field label="Dispatch estimate"><input placeholder="Dispatch in 2–3 working days" value={p.editorial.dispatchEstimate} onChange={(e) => editorial("dispatchEstimate",e.target.value)} /></Field><Field label="Materials (comma separated)"><input value={p.editorial.materials.join(", ")} onChange={(e) => editorial("materials",e.target.value.split(",").map((s) => s.trim()))} /></Field><Field label="Dimensions"><input value={p.editorial.dimensions} onChange={(e) => editorial("dimensions",e.target.value)} /></Field></div>
  <Field label="Why it made the edit"><textarea rows={3} value={p.editorial.curationNote} onChange={(e) => editorial("curationNote",e.target.value)} /></Field>
  <Field label="Buying caveats (one per line)"><textarea rows={2} value={p.editorial.caveats.join("\n")} onChange={(e) => editorial("caveats",e.target.value.split("\n").filter(Boolean))} /></Field>
  <Field label="Care instructions"><textarea rows={2} value={p.editorial.careInstructions ?? ""} onChange={(e) => editorial("careInstructions",e.target.value)} /></Field>
  <Field label="Category clearance"><select value={p.editorial.restrictionStatus} onChange={(e) => editorial("restrictionStatus",e.target.value as ProductInput["editorial"]["restrictionStatus"])}><option value="none">Cleared for sale</option><option value="review_before_launch">Review needed — purchasing blocked</option><option value="18_plus">Age restriction — purchasing blocked</option></select></Field>
  <div className="system-actions"><button className="system-button" disabled={busy || uploading}>Save product</button><button className="system-secondary" type="button" onClick={onCancel}>Back to catalogue</button></div></form>;
}

function OrderEditor({ order: o, onChange, busy, onCancel, onSave }: { order: OrderRecord; onChange: (o: OrderRecord) => void; busy: boolean; onCancel: () => void; onSave: () => Promise<void> }) {
  return <form className="system-form" onSubmit={(e) => { e.preventDefault(); void onSave(); }}><h2>{o.reference}</h2><div className="system-form-grid"><div className="system-panel"><h3>Customer & delivery</h3><p>{o.data.customer.name}<br />{o.data.customer.address}<br />{o.data.customer.city} {o.data.customer.postalCode}</p><p><a href={`mailto:${o.data.customer.email}`}>{o.data.customer.email}</a><br /><a href={`tel:${o.data.customer.phone}`}>{o.data.customer.phone}</a></p><p>{o.data.customer.notes}</p></div><div className="system-panel"><h3>Order total</h3>{o.data.lines.map((l) => <p key={l.merchandiseId}>{l.quantity} × {l.title} · {l.variantTitle} <strong>{money(l.unitPaisa*l.quantity)}</strong></p>)}<p>Delivery <strong>{money(o.data.shippingPaisa)}</strong></p><p>Total <strong>{money(o.data.totalPaisa)}</strong></p><small>{o.data.paymentMethod === "cod" ? "Cash on delivery" : "Bank transfer"}</small></div></div>
    <div className="system-form-grid"><Field label="Order status"><select value={o.status} onChange={(e) => onChange({ ...o, status: e.target.value as OrderRecord["status"] })}>{["pending","confirmed","processing","shipped","delivered","cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}</select></Field><Field label="Payment status"><select value={o.payment_status} onChange={(e) => onChange({ ...o, payment_status: e.target.value as OrderRecord["payment_status"] })}>{["unpaid","paid","refund_due","refunded"].map((s) => <option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></Field><Field label="Courier"><input value={o.data.courier} onChange={(e) => onChange({ ...o, data: { ...o.data, courier: e.target.value } })} /></Field><Field label="Tracking number"><input value={o.data.trackingNumber} onChange={(e) => onChange({ ...o, data: { ...o.data, trackingNumber: e.target.value } })} /></Field></div><Field label="Internal notes"><textarea rows={3} value={o.data.adminNote} onChange={(e) => onChange({ ...o, data: { ...o.data, adminNote: e.target.value } })} /></Field><p className="system-muted">Cancellation restores stock once. “Paid” records money you have verified; “refunded” records a refund completed outside this system.</p><div className="system-actions"><button className="system-button" disabled={busy}>Save order</button><button type="button" className="system-secondary" onClick={onCancel}>Back to orders</button></div></form>;
}

function SettingsEditor({ value: s, onChange, busy, onSave }: { value: StoreSettings; onChange: (value: StoreSettings) => void; busy: boolean; onSave: () => Promise<void> }) {
  const update = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => onChange({ ...s, [key]: value });
  return <form className="system-form" onSubmit={(e) => { e.preventDefault(); void onSave(); }}><div className="system-panel"><h2>Open for orders</h2><p>Keep checkout closed while preparing products and policies. All required setup must be complete before opening.</p><label className="system-check"><input type="checkbox" checked={s.checkoutEnabled} onChange={(e) => update("checkoutEnabled",e.target.checked)} />Accept customer orders</label></div>
  <fieldset className="system-fieldset"><legend>Payments</legend><label className="system-check"><input type="checkbox" checked={s.codEnabled} onChange={(e) => update("codEnabled",e.target.checked)} />Cash on delivery</label><label className="system-check"><input type="checkbox" checked={s.bankTransferEnabled} onChange={(e) => update("bankTransferEnabled",e.target.checked)} />Bank transfer</label><Field label="Bank transfer instructions"><textarea rows={3} placeholder="Bank, account title, account number / IBAN, payment reference and confirmation process" value={s.bankInstructions} onChange={(e) => update("bankInstructions",e.target.value)} /></Field></fieldset>
  <div className="system-form-grid"><Field label="Delivery charge · PKR"><input type="number" min={0} step={1} required value={s.shippingFee} onChange={(e) => update("shippingFee",Number(e.target.value))} /></Field><Field label="Free delivery above · PKR (0 disables)"><input type="number" min={0} step={1} value={s.freeShippingAbove} onChange={(e) => update("freeShippingAbove",Number(e.target.value))} /></Field><Field label="Customer support email"><input type="email" value={s.contactEmail} onChange={(e) => update("contactEmail",e.target.value)} /></Field><Field label="Customer support phone"><input value={s.contactPhone} onChange={(e) => update("contactPhone",e.target.value)} /></Field></div>
  <Field label="Delivery cities (one per line)"><textarea rows={4} placeholder="Lahore\nIslamabad\nKarachi" value={s.serviceCities.join("\n")} onChange={(e) => update("serviceCities",e.target.value.split("\n").filter(Boolean))} /></Field>
  {(["deliveryPolicy","returnPolicy","privacyPolicy"] as const).map((key) => <Field key={key} label={{ deliveryPolicy: "Delivery policy", returnPolicy: "Returns & refunds policy", privacyPolicy: "Privacy policy" }[key]}><textarea rows={5} value={s[key]} onChange={(e) => update(key,e.target.value)} /></Field>)}
  <button className="system-button" disabled={busy}>Save store settings</button></form>;
}
