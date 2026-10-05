import type { Metadata } from "next";
import "./globals.css";
import "./atelier.css";

import { CartProvider } from "./commerce/cart-context";
import { CartDrawer } from "./components/cart-drawer";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://curated-mens-gear.arezasif7.chatgpt.site")),
  title: "The Curated Goods Storefront",
  description: "A refined Pakistani storefront for curated men's gear, EDC, accessories and collectible objects.",
  openGraph: {
    title: "The Curated Goods Storefront",
    description: "Men's gear, edited. A premium Pakistani storefront prototype.",
    type: "website",
    images: [{ url: "/og-card.png", width: 1200, height: 630, alt: "The Curated Goods Storefront" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Curated Goods Storefront",
    description: "Men's gear, edited. A premium Pakistani storefront prototype.",
    images: ["/og-card.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
