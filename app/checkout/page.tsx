import type { Metadata } from "next";
import { Checkout } from "./checkout-client";
export const metadata: Metadata = { title: "Checkout | The Edit", robots: { index: false, follow: false } };
export default function CheckoutPage() { return <Checkout />; }
