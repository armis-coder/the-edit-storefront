import type { Metadata } from "next";
import { isOwner } from "@/lib/store/security";
import { AdminDesk } from "./store-admin";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Store admin | The Edit", robots: { index: false, follow: false } };
export default async function AdminPage() { return <AdminDesk signedIn={await isOwner()} />; }
