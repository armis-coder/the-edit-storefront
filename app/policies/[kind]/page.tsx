import { notFound } from "next/navigation";
import { StoreHeader } from "@/app/components/store-header";
import { StoreFooter } from "@/app/components/store-footer";
import { getSettings } from "@/lib/store/catalogue";
import { activeCommerceProvider } from "@/lib/commerce/provider";
import { defaultSettings } from "@/lib/store/validation";
export const dynamic = "force-dynamic";
export default async function PolicyPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const pages = { delivery: ["Delivery", "deliveryPolicy"], returns: ["Returns & refunds", "returnPolicy"], privacy: ["Privacy", "privacyPolicy"] } as const;
  if (!(kind in pages)) notFound();
  const [title,key] = pages[kind as keyof typeof pages];
  const settings = activeCommerceProvider() === "independent" ? await getSettings() : defaultSettings;
  return <main className="commerce-page"><StoreHeader /><section className="system-page policy-page"><p className="system-kicker">THE / EDIT — CUSTOMER INFORMATION</p><h1>{title}.</h1><div className="policy-copy">{settings[key] || "This policy is being prepared. Checkout remains closed until our delivery and customer policies are ready."}</div>{settings.contactEmail && <p>Questions? <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a></p>}</section><StoreFooter /></main>;
}
