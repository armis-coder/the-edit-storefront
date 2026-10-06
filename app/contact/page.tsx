import { StoreHeader } from "@/app/components/store-header";
import { StoreFooter } from "@/app/components/store-footer";
import { getSettings } from "@/lib/store/catalogue";
import { activeCommerceProvider } from "@/lib/commerce/provider";
import { defaultSettings } from "@/lib/store/validation";
export const dynamic = "force-dynamic";
export default async function ContactPage() {
  const settings = activeCommerceProvider() === "independent" ? await getSettings() : defaultSettings;
  return <main className="commerce-page"><StoreHeader /><section className="system-page policy-page"><p className="system-kicker">THE / EDIT — CONTACT</p><h1>Speak to the edit.</h1><p>For product questions or help with an order, include your order reference when contacting us.</p>{settings.contactEmail ? <div className="system-panel"><p><a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a></p><p><a href={`tel:${settings.contactPhone}`}>{settings.contactPhone}</a></p></div> : <p>Customer support details will be published before orders open.</p>}</section><StoreFooter /></main>;
}
