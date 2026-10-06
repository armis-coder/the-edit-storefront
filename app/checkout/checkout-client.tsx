"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useCart } from "@/app/commerce/cart-context";
import { StoreHeader } from "@/app/components/store-header";
import { StoreFooter } from "@/app/components/store-footer";
import type { Quote } from "@/lib/store/orders";

type Attempt = { requestKey: string; accessToken: string; quoteToken: string; lines: { merchandiseId: string; quantity: number }[]; customer: Record<string, FormDataEntryValue | null>; paymentMethod: string; acceptedPolicies: boolean; website: FormDataEntryValue | null };
const ATTEMPT_KEY = "edit-checkout-pending";
type Config = { checkoutEnabled: boolean; serviceCities: string[]; codEnabled: boolean; bankTransferEnabled: boolean; contactEmail?: string; contactPhone?: string };
const money = (paisa: number) => `PKR ${(paisa/100).toLocaleString("en-PK",{ maximumFractionDigits: 2 })}`;
const secretToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)),(b) => b.toString(16).padStart(2,"0")).join("");

export function Checkout() {
  const { lines, clearCart, ready } = useCart();
  const [config,setConfig] = useState<Config | null>(null);
  const [quoteState,setQuoteState] = useState<{ quote: Quote; lineKey: string; refresh: number } | null>(null);
  const [error,setError] = useState(""); const [busy,setBusy] = useState(false); const [refresh,setRefresh] = useState(0);
  const [credentials,setCredentials] = useState<{ requestKey: string; accessToken: string } | null>(null);
  const [submitted,setSubmitted] = useState<Attempt | null>(null);
  const [payment,setPayment] = useState("cod");
  const lineKey = useMemo(() => JSON.stringify(lines.map((l) => ({ merchandiseId: l.merchandiseId, quantity: l.quantity }))),[lines]);
  const quote = quoteState?.lineKey === lineKey && quoteState.refresh === refresh ? quoteState.quote : null;
  const quoting = Boolean(config?.checkoutEnabled && ready && lines.length && !quote && !error);
  useEffect(() => {
    // Keep an interrupted request in this tab only, never in permanent browser storage.
    Promise.resolve().then(() => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(ATTEMPT_KEY) ?? "null");
        if(saved && /^[a-f0-9]{64}$/.test(saved.accessToken) && typeof saved.requestKey === "string" && saved.lines?.length) {
          setSubmitted(saved); setCredentials({ requestKey: saved.requestKey, accessToken: saved.accessToken });
        }
      } catch { /* Storage may be unavailable. In-page retries still use the same key. */ }
    });
  },[]);
  useEffect(() => { const controller = new AbortController(); fetch("/api/store/config",{ signal: controller.signal }).then(async (r) => { const data = await r.json(); if(!r.ok) throw new Error(data.error); setConfig(data); setPayment(data.codEnabled ? "cod" : "bank_transfer"); }).catch((e) => { if(e.name !== "AbortError") setError(e.message); }); return () => controller.abort(); },[]);
  useEffect(() => {
    if(!config?.checkoutEnabled || !ready || !lines.length) return;
    const controller = new AbortController();
    fetch("/api/store/quote",{ method: "POST", headers: { "Content-Type": "application/json" }, body: lineKey, signal: controller.signal }).then(async (r) => { const data = await r.json(); if(!r.ok) throw new Error(data.error); setQuoteState({ quote: data, lineKey, refresh }); }).catch((e) => { if(e.name !== "AbortError") setError(e.message); });
    return () => controller.abort();
  },[lineKey,config,ready,refresh,lines.length]);

  async function place(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(!quote || busy) return;
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const current = credentials ?? { requestKey: crypto.randomUUID(), accessToken: secretToken() }; setCredentials(current);
    const body = submitted ?? { ...current, quoteToken: quote.quoteToken, lines: JSON.parse(lineKey), customer: { name: form.get("name"), email: form.get("email"), phone: String(form.get("phone") ?? "").replace(/[\s-]/g,""), address: form.get("address"), city: form.get("city"), postalCode: form.get("postalCode"), notes: form.get("notes") }, paymentMethod: payment, acceptedPolicies: form.get("policies") === "on", website: form.get("website") };
    await sendAttempt(body as Attempt);
  }
  async function sendAttempt(body: Attempt) {
    setBusy(true); setError(""); setSubmitted(body);
    try { sessionStorage.setItem(ATTEMPT_KEY,JSON.stringify(body)); } catch { /* In-page retry remains available. */ }
    try {
      const response = await fetch("/api/store/orders",{ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const data = await response.json();
      if(!response.ok) { if(response.status < 500) { setSubmitted(null); setCredentials(null); try { sessionStorage.removeItem(ATTEMPT_KEY); } catch { /* Optional storage. */ } } if(response.status === 409) setRefresh((v) => v+1); throw new Error(data.error); }
      try { localStorage.setItem(`edit-order-${data.id}`,body.accessToken); } catch { /* The private URL also holds access in its fragment. */ }
      try { sessionStorage.removeItem(ATTEMPT_KEY); } catch { /* Optional storage. */ }
      clearCart(); window.location.assign(`/orders/${data.id}#${body.accessToken}`);
    } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <main className="commerce-page"><StoreHeader /><section className="system-page checkout-page"><div className="system-heading"><p className="system-kicker">YOUR SELECTION / CHECKOUT</p><h1>The final details.</h1><p>Delivery in Pakistan. Review your selection before placing the order.</p></div>
    {error && <p className="system-error" role="alert">{error}</p>}
    {submitted ? <div className="system-panel"><h2>Finish your checkout.</h2><p>Your previous request may already have created an order. Continue with the same details to retrieve that order or safely complete the request.</p><button className="system-button" type="button" disabled={busy} onClick={() => sendAttempt(submitted)}>{busy ? "Checking your order…" : "Continue this order"}</button><p className="system-muted">This retry uses the same order key and cannot place a duplicate.</p></div> : !config || !ready ? <p className="system-muted">Preparing checkout…</p> : !config.checkoutEnabled ? <div className="system-panel"><h2>The store is being prepared.</h2><p>Orders will open once the catalogue and delivery arrangements are ready.</p><Link className="system-secondary" href="/">Return to the collection</Link></div> : !lines.length ? <div className="system-panel"><h2>Your bag is empty.</h2><Link className="system-button" href="/collections/current-edit">Explore the edit</Link></div> : <div className="checkout-grid"><form className="system-form" onSubmit={place}><fieldset disabled={busy}><legend>Contact & delivery</legend><div className="system-form-grid"><label className="system-field"><span>Full name</span><input name="name" required minLength={2} maxLength={100} autoComplete="name" /></label><label className="system-field"><span>Email</span><input name="email" type="email" required maxLength={180} autoComplete="email" /></label><label className="system-field"><span>Mobile number</span><input name="phone" type="tel" required placeholder="03001234567" autoComplete="tel" /></label><label className="system-field"><span>City</span><select name="city" required defaultValue=""><option value="" disabled>Select a delivery city</option>{config.serviceCities.map((city) => <option key={city} value={city}>{city}</option>)}</select></label></div><label className="system-field"><span>Delivery address</span><textarea name="address" required minLength={10} maxLength={500} rows={3} placeholder="House, street, area and nearby landmark" autoComplete="street-address" /></label><label className="system-field"><span>Postal code (optional)</span><input name="postalCode" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} autoComplete="postal-code" /></label><label className="system-field"><span>Delivery notes (optional)</span><textarea name="notes" maxLength={1000} rows={2} /></label><label className="system-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" defaultValue="" /></label></fieldset>
    <fieldset className="system-fieldset" disabled={busy}><legend>Payment method</legend>{config.codEnabled && <label className={`payment-option ${payment === "cod" ? "selected" : ""}`}><input type="radio" name="payment" value="cod" checked={payment === "cod"} onChange={() => setPayment("cod")} /><span><strong>Cash on delivery</strong><small>Pay the courier when your order arrives.</small></span></label>}{config.bankTransferEnabled && <label className={`payment-option ${payment === "bank_transfer" ? "selected" : ""}`}><input type="radio" name="payment" value="bank_transfer" checked={payment === "bank_transfer"} onChange={() => setPayment("bank_transfer")} /><span><strong>Bank transfer</strong><small>Instructions appear after placing the order. Dispatch follows payment confirmation.</small></span></label>}</fieldset>
    <label className="system-check"><input name="policies" type="checkbox" required disabled={busy} /><span>I agree to the <Link href="/policies/delivery" target="_blank">delivery</Link> and <Link href="/policies/returns" target="_blank">returns</Link> policies, and have read the <Link href="/policies/privacy" target="_blank">privacy policy</Link>.</span></label>
    {submitted != null && <p className="system-muted">A retry submits the same order details. If a previous request succeeded, it will return that order.</p>}
    <button className="system-button" disabled={!quote || busy || quoting}>{busy ? "Placing your order…" : submitted ? "Retry this order" : "Place order"}</button><small>No card information is requested. Orders are subject to confirmation.</small></form>
    <aside className="system-panel checkout-summary"><p className="system-kicker">ORDER SUMMARY</p><h2>Your edit.</h2>{quoting && <p role="status">Checking current prices and stock…</p>}{quote ? <>{quote.lines.map((line) => <div className="checkout-summary-line" key={line.merchandiseId}><span><strong>{line.title}</strong><small>{line.variantTitle} · Quantity {line.quantity}</small></span><span>{money(line.unitPaisa*line.quantity)}</span></div>)}<dl><div><dt>Subtotal</dt><dd>{money(quote.subtotalPaisa)}</dd></div><div><dt>Delivery</dt><dd>{money(quote.shippingPaisa)}</dd></div><div className="checkout-total"><dt>Total</dt><dd>{money(quote.totalPaisa)}</dd></div></dl></> : <button className="system-secondary" type="button" disabled={quoting} onClick={() => setRefresh((v) => v+1)}>Check selection again</button>}<Link href="/collections/current-edit">Continue browsing</Link></aside></div>}
  </section><StoreFooter /></main>;
}
