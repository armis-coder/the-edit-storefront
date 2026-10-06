import { z } from "zod";

const short = z.string().trim().min(1).max(180);
const money = z.string().regex(/^\d{1,6}(\.\d{1,2})?$/, "Use a price such as 2500 or 2500.50").refine((v) => Number(v) > 0 && Number(v) <= 1000000, "Price must be greater than zero");
const imageUrl = z.string().trim().max(2000).refine((value) => { if (/^\/api\/store\/media\/[a-f0-9-]{36}$/.test(value)) return true; try { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password; } catch { return false; } }, "Upload a product image or use a public HTTPS image URL");
export const initialCollections = [
  { handle: "current-edit", title: "The Current Edit", description: "Objects chosen for purpose, construction and value." },
  { handle: "everyday-carry", title: "Everyday carry", description: "Compact essentials chosen for daily utility." },
  { handle: "time-and-carry", title: "Time & carry", description: "Watches, wallets and personal essentials." },
  { handle: "collector-masks", title: "Collector masks", description: "Display pieces selected for finish and presence." },
  { handle: "blades-and-tools", title: "Blades & tools", description: "Utility and collector pieces." },
  { handle: "under-3000", title: "Objects under PKR 3,000", description: "Considered, useful finds below PKR 3,000." },
];
const handles = new Set(initialCollections.map((c) => c.handle));
export const productSchema = z.object({
  id: z.uuid().optional(), revision: z.string().max(80).optional(), handle: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  title: short, status: z.enum(["draft", "active", "archived"]),
  productType: short, vendor: short.default("The Edit"), description: z.string().trim().min(10).max(5000),
  images: z.array(z.object({ url: imageUrl, altText: z.string().trim().max(250) })).max(8),
  collectionHandles: z.array(z.string().refine((v) => handles.has(v))).min(1).max(6),
  tags: z.array(z.string().trim().max(60)).max(20),
  variants: z.array(z.object({ id: z.uuid().optional(), title: short, sku: z.string().trim().max(80), price: money, stock: z.number().int().min(0).max(100000) })).min(1).max(30),
  editorial: z.object({ curationNote: z.string().trim().max(2000), materials: z.array(short).max(12), dimensions: z.string().trim().max(300), fulfillmentModel: z.enum(["in_stock", "supplier_fulfilled", "preorder"]), dispatchEstimate: z.string().trim().max(300), caveats: z.array(z.string().trim().max(500)).max(10), careInstructions: z.string().trim().max(2000).optional(), restrictionStatus: z.enum(["none", "review_before_launch", "18_plus"]) }),
}).superRefine((p, ctx) => {
  if (p.status === "active" && (!p.images.length || !p.editorial.dispatchEstimate || !p.editorial.curationNote)) ctx.addIssue({ code: "custom", message: "Active products need an image, dispatch estimate and curation note." });
  if (new Set(p.variants.map((v) => v.title)).size !== p.variants.length) ctx.addIssue({ code: "custom", message: "Variant names must be unique." });
  const ids = p.variants.flatMap((v) => v.id ? [v.id] : []);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "Variant IDs must be unique." });
});
export type ProductInput = z.infer<typeof productSchema>;

export const settingsSchema = z.object({
  checkoutEnabled: z.boolean(), codEnabled: z.boolean(), bankTransferEnabled: z.boolean(),
  shippingFee: z.number().int().min(0).max(10000), // whole PKR
  freeShippingAbove: z.number().int().min(0).max(1000000), // zero disables
  serviceCities: z.array(short).max(100), // explicit city coverage
  contactEmail: z.email().or(z.literal("")), contactPhone: z.string().trim().max(40),
  bankInstructions: z.string().trim().max(2000), deliveryPolicy: z.string().trim().max(5000),
  returnPolicy: z.string().trim().max(5000), privacyPolicy: z.string().trim().max(5000),
}).superRefine((s, ctx) => {
  if (!s.checkoutEnabled) return;
  if (!s.codEnabled && !s.bankTransferEnabled) ctx.addIssue({ code: "custom", message: "Enable at least one payment method." });
  if (!s.serviceCities.length || !s.contactEmail || !s.contactPhone || !s.deliveryPolicy || !s.returnPolicy || !s.privacyPolicy) ctx.addIssue({ code: "custom", message: "Add delivery cities, contact details and all policies before opening checkout." });
  if (s.bankTransferEnabled && !s.bankInstructions) ctx.addIssue({ code: "custom", message: "Add bank transfer instructions." });
});
export type StoreSettings = z.infer<typeof settingsSchema>;
export const defaultSettings: StoreSettings = { checkoutEnabled: false, codEnabled: false, bankTransferEnabled: false, shippingFee: 0, freeShippingAbove: 0, serviceCities: [], contactEmail: "", contactPhone: "", bankInstructions: "", deliveryPolicy: "", returnPolicy: "", privacyPolicy: "" };

export const linesSchema = z.array(z.object({ merchandiseId: z.uuid(), quantity: z.number().int().min(1).max(20) })).min(1).max(30);
export const checkoutSchema = z.object({
  requestKey: z.uuid(), accessToken: z.string().regex(/^[a-f0-9]{64}$/), quoteToken: z.string().max(200), lines: linesSchema,
  customer: z.object({ name: z.string().trim().min(2).max(100), email: z.email().max(180), phone: z.string().trim().regex(/^(?:\+92|0092|0)3\d{9}$/, "Enter a Pakistani mobile number such as 03001234567"), address: z.string().trim().min(10).max(500), city: short, postalCode: z.string().trim().regex(/^\d{5}$/).or(z.literal("")), notes: z.string().trim().max(1000) }),
  paymentMethod: z.enum(["cod", "bank_transfer"]), acceptedPolicies: z.literal(true), website: z.literal("").default(""),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export class StoreError extends Error { constructor(message: string, readonly status = 400) { super(message); } }
export function paisa(value: string) { const [whole, decimal = ""] = value.split("."); return Number(whole) * 100 + Number(decimal.padEnd(2, "0")); }
export function amount(value: number) { return (value / 100).toFixed(2); }
