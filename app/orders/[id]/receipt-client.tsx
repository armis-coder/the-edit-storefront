"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { orderReceipt } from "@/lib/store/orders";
import { StoreHeader } from "@/app/components/store-header";
type Receipt = Awaited<ReturnType<typeof orderReceipt>>;
const money = (paisa: number) => `PKR ${(paisa/100).toLocaleString("en-PK")}`;
export function OrderReceipt({ id }: { id: string }) {
  const [order,setOrder] = useState<Receipt | null>(null); const [error,setError] = useState(""); const [refresh,setRefresh] = useState(0);
  useEffect(() => { const controller = new AbortController(); let token = window.location.hash.slice(1); if(!token) { try { token = localStorage.getItem(`edit-order-${id}`) ?? ""; } catch {} }
    async function load() {
      if(!token) throw new Error("Open the private order link you saved after checkout.");
      const response = await fetch(`/api/store/orders/${id}`,{ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }), signal: controller.signal });
      const data = await response.json(); if(!response.ok) throw new Error(data.error); setOrder(data); setError("");
    }
    void load().catch((e) => { if(e.name !== "AbortError") setError(e.message); }); return () => controller.abort();
  },[id,refresh]);
  return <main className="commerce-page"><StoreHeader /><section className="system-page receipt-page"><p className="system-kicker">THE / EDIT — YOUR ORDER</p><h1>{order ? "Your order is received." : "Your order."}</h1>{error && <p className="system-error" role="alert">{error}</p>}{!order && !error && <p>Loading your order…</p>}{order && <><div className="system-panel"><span className="status-pill">{order.status}</span><h2>{order.reference}</h2><p>Thank you, {order.name}. Delivery city: {order.city}.</p><p>Payment: {order.paymentMethod === "cod" ? "cash on delivery" : "bank transfer"} · {order.paymentStatus.replaceAll("_"," ")}</p><div className="receipt-lines">{order.lines.map((line) => <p key={line.merchandiseId}>{line.quantity} × {line.title} <small>{line.variantTitle}</small><strong>{money(line.quantity*line.unitPaisa)}</strong></p>)}<p>Delivery<strong>{money(order.shippingPaisa)}</strong></p><p className="checkout-total">Total<strong>{money(order.totalPaisa)}</strong></p></div>{order.bankInstructions && <div className="receipt-instructions"><h3>Bank transfer instructions</h3><p>{order.bankInstructions}</p><p>Use {order.reference} as your payment reference. The owner will confirm receipt before dispatch.</p></div>}{order.trackingNumber && <p>Tracking: {order.courier} · {order.trackingNumber}</p>}<p>Questions? <a href={`mailto:${order.contactEmail}`}>{order.contactEmail}</a> · <a href={`tel:${order.contactPhone}`}>{order.contactPhone}</a></p></div><p className="system-muted">Save this private link to check your order status. It provides access to your order summary.</p><div className="system-actions"><button className="system-secondary" onClick={() => setRefresh((v) => v+1)}>Refresh status</button><button className="system-secondary" onClick={() => window.print()}>Print receipt</button><Link className="system-button" href="/">Continue exploring</Link></div></>}</section></main>;
}
