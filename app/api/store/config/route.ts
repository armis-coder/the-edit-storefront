import { NextResponse } from "next/server";
import { getSettings } from "@/lib/store/catalogue";
import { activeCommerceProvider } from "@/lib/commerce/provider";
import { apiError } from "@/lib/store/security";
export async function GET() {
  try {
    if (activeCommerceProvider() !== "independent") return NextResponse.json({ checkoutEnabled: false, serviceCities: [], codEnabled: false, bankTransferEnabled: false });
    const settings = await getSettings();
    return NextResponse.json({ checkoutEnabled: settings.checkoutEnabled, serviceCities: settings.serviceCities, codEnabled: settings.codEnabled, bankTransferEnabled: settings.bankTransferEnabled, contactEmail: settings.contactEmail, contactPhone: settings.contactPhone },{ headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
