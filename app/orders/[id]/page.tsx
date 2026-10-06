import type { Metadata } from "next";
import { OrderReceipt } from "./receipt-client";
export const metadata: Metadata = { title: "Your order | The Edit", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) { return <OrderReceipt id={(await params).id} />; }
