import type { Collection, CommerceImage, Product } from "./types";

const image = (
  crop: CommerceImage["crop"],
  altText: string,
): CommerceImage => ({
  url: "/product-sprite.png",
  altText,
  width: 900,
  height: 900,
  crop,
});

export const mockProducts: Product[] = [
  {
    id: "mock-product-kestrel",
    handle: "kestrel-fold-no-03",
    title: "Kestrel Fold / No. 03",
    productType: "Pocket tool",
    vendor: "The Edit",
    description:
      "A compact folding utility object selected for its balanced proportions, simple construction and useful everyday format.",
    tags: ["everyday carry", "pocket tool", "steel", "editor's pick"],
    badge: "Editor’s pick",
    featuredImage: image("sprite-1", "Kestrel folding pocket tool in a dark presentation setting"),
    images: [
      image("sprite-1", "Kestrel folding pocket tool, presentation view"),
      image("sprite-1", "Kestrel folding pocket tool, detail view"),
    ],
    options: [{ name: "Finish", values: ["Stonewashed", "Black oxide"] }],
    variants: [
      {
        id: "mock-variant-kestrel-stonewash",
        title: "Stonewashed",
        availableForSale: true,
        quantityAvailable: 8,
        selectedOptions: [{ name: "Finish", value: "Stonewashed" }],
        price: { amount: "3850", currencyCode: "PKR" },
      },
      {
        id: "mock-variant-kestrel-black",
        title: "Black oxide",
        availableForSale: true,
        quantityAvailable: 4,
        selectedOptions: [{ name: "Finish", value: "Black oxide" }],
        price: { amount: "4150", currencyCode: "PKR" },
      },
    ],
    availableForSale: true,
    collectionHandles: ["current-edit", "everyday-carry", "blades-and-tools"],
    editorial: {
      curationNote:
        "Shortlisted for a compact footprint, restrained detailing and a construction that can be explained without inflated claims.",
      materials: ["Stainless steel", "Textured composite scales"],
      dimensions: "Closed length approximately 10.4 cm",
      fulfillmentModel: "in_stock",
      dispatchEstimate: "Dispatch target: 1–2 working days",
      caveats: ["Final production specification and supplier batch must be verified."],
      careInstructions: "Wipe dry after handling and apply a light protective oil when stored.",
      restrictionStatus: "review_before_launch",
    },
    seo: {
      title: "Kestrel Fold No. 03 | The Edit",
      description: "A representative compact pocket tool from The Edit’s curated everyday carry collection.",
    },
  },
  {
    id: "mock-product-atlas",
    handle: "atlas-minimal-40mm",
    title: "Atlas Minimal / 40mm",
    productType: "Everyday watch",
    vendor: "The Edit",
    description:
      "A quiet 40 mm everyday watch with a clean dial, legible markers and two considered strap options.",
    tags: ["watch", "time", "minimal", "new"],
    badge: "New",
    featuredImage: image("sprite-2", "Atlas Minimal 40 millimetre watch on a dark surface"),
    images: [
      image("sprite-2", "Atlas Minimal watch, full view"),
      image("sprite-2", "Atlas Minimal watch, dial detail"),
    ],
    options: [{ name: "Strap", values: ["Black leather", "Steel mesh"] }],
    variants: [
      {
        id: "mock-variant-atlas-leather",
        title: "Black leather",
        availableForSale: true,
        quantityAvailable: 6,
        selectedOptions: [{ name: "Strap", value: "Black leather" }],
        price: { amount: "7900", currencyCode: "PKR" },
      },
      {
        id: "mock-variant-atlas-mesh",
        title: "Steel mesh",
        availableForSale: true,
        quantityAvailable: 3,
        selectedOptions: [{ name: "Strap", value: "Steel mesh" }],
        price: { amount: "8450", currencyCode: "PKR" },
      },
    ],
    availableForSale: true,
    collectionHandles: ["current-edit", "time-and-carry"],
    editorial: {
      curationNote:
        "Chosen as a useful baseline watch: restrained enough for daily wear, distinctive enough to avoid feeling anonymous.",
      materials: ["Stainless steel case", "Mineral crystal", "Leather or steel strap"],
      dimensions: "40 mm case · 20 mm lug width",
      fulfillmentModel: "supplier_fulfilled",
      dispatchEstimate: "Dispatch target: 3–5 working days",
      caveats: ["Water-resistance rating will be confirmed against the final supplier batch."],
      careInstructions: "Keep the leather strap dry and clean the case with a soft cloth.",
      restrictionStatus: "none",
    },
    seo: {
      title: "Atlas Minimal 40mm Watch | The Edit",
      description: "A clean representative everyday watch selected for The Edit’s time and carry collection.",
    },
  },
  {
    id: "mock-product-noir-sleeve",
    handle: "noir-card-sleeve",
    title: "Noir Card Sleeve",
    productType: "Leather carry",
    vendor: "The Edit",
    description:
      "A slim card sleeve with a minimal profile, straightforward storage and edges that improve with use.",
    tags: ["wallet", "leather", "everyday carry", "under 3000"],
    featuredImage: image("sprite-3", "Noir leather card sleeve in an editorial setting"),
    images: [
      image("sprite-3", "Noir card sleeve, front view"),
      image("sprite-3", "Noir card sleeve, edge detail"),
    ],
    options: [{ name: "Colour", values: ["Obsidian", "Tobacco"] }],
    variants: [
      {
        id: "mock-variant-noir-obsidian",
        title: "Obsidian",
        availableForSale: true,
        quantityAvailable: 12,
        selectedOptions: [{ name: "Colour", value: "Obsidian" }],
        price: { amount: "1750", currencyCode: "PKR" },
      },
      {
        id: "mock-variant-noir-tobacco",
        title: "Tobacco",
        availableForSale: false,
        quantityAvailable: 0,
        selectedOptions: [{ name: "Colour", value: "Tobacco" }],
        price: { amount: "1750", currencyCode: "PKR" },
      },
    ],
    availableForSale: true,
    collectionHandles: ["current-edit", "everyday-carry", "time-and-carry", "under-3000"],
    editorial: {
      curationNote:
        "Selected because it does one job without decorative excess and makes material, capacity and limitations easy to understand.",
      materials: ["Full-grain leather", "Bonded nylon thread"],
      dimensions: "10.2 × 7.1 cm · up to 6 cards",
      fulfillmentModel: "in_stock",
      dispatchEstimate: "Dispatch target: 1–2 working days",
      caveats: ["Natural leather grain and colour vary between pieces."],
      careInstructions: "Condition sparingly and avoid prolonged moisture.",
      restrictionStatus: "none",
    },
    seo: {
      title: "Noir Card Sleeve | The Edit",
      description: "A compact leather card sleeve selected for simple, low-profile everyday carry.",
    },
  },
  {
    id: "mock-product-cipher-mask",
    handle: "cipher-display-mask",
    title: "Cipher Display Mask",
    productType: "Collector object",
    vendor: "The Edit",
    description:
      "A sculptural display mask chosen for silhouette and presence, intended as a decorative collector object.",
    tags: ["mask", "collector", "display", "limited"],
    badge: "Limited",
    featuredImage: image("sprite-4", "Cipher black collector display mask"),
    images: [
      image("sprite-4", "Cipher display mask, front view"),
      image("sprite-4", "Cipher display mask, surface detail"),
    ],
    options: [{ name: "Edition", values: ["Black / 01"] }],
    variants: [
      {
        id: "mock-variant-cipher-black",
        title: "Black / 01",
        availableForSale: true,
        quantityAvailable: 2,
        selectedOptions: [{ name: "Edition", value: "Black / 01" }],
        price: { amount: "4400", currencyCode: "PKR" },
      },
    ],
    availableForSale: true,
    collectionHandles: ["current-edit", "collector-masks"],
    editorial: {
      curationNote:
        "Included for its strong silhouette and display value, with its decorative purpose stated clearly rather than dressed up as utility.",
      materials: ["Cast resin", "Satin protective finish"],
      dimensions: "Approximately 24 × 16 cm",
      fulfillmentModel: "preorder",
      dispatchEstimate: "Estimated dispatch: 7–10 working days",
      caveats: ["Display object only.", "Final finish may show minor hand-worked variation."],
      restrictionStatus: "none",
    },
    seo: {
      title: "Cipher Display Mask | The Edit",
      description: "A sculptural black display mask selected as a representative collector object.",
    },
  },
  {
    id: "mock-product-titan-key",
    handle: "titan-key-system",
    title: "Titan Key System",
    productType: "Key organiser",
    vendor: "The Edit",
    description:
      "A compact key organiser that reduces pocket noise and keeps a small daily set aligned.",
    tags: ["keys", "organiser", "everyday carry", "staff find", "under 3000"],
    badge: "Staff find",
    featuredImage: image("sprite-5", "Titan compact key organiser"),
    images: [
      image("sprite-5", "Titan key system, assembled view"),
      image("sprite-5", "Titan key system, hardware detail"),
    ],
    options: [{ name: "Capacity", values: ["4 keys", "8 keys"] }],
    variants: [
      {
        id: "mock-variant-titan-4",
        title: "4 keys",
        availableForSale: true,
        quantityAvailable: 15,
        selectedOptions: [{ name: "Capacity", value: "4 keys" }],
        price: { amount: "2650", currencyCode: "PKR" },
      },
      {
        id: "mock-variant-titan-8",
        title: "8 keys",
        availableForSale: true,
        quantityAvailable: 9,
        selectedOptions: [{ name: "Capacity", value: "8 keys" }],
        price: { amount: "2950", currencyCode: "PKR" },
      },
    ],
    availableForSale: true,
    collectionHandles: ["current-edit", "everyday-carry", "under-3000"],
    editorial: {
      curationNote:
        "A small intervention with a clear everyday payoff: less movement, less noise and no unnecessary mechanism.",
      materials: ["Anodised aluminium", "Stainless hardware"],
      dimensions: "8.4 × 2.1 cm · adjustable capacity",
      fulfillmentModel: "in_stock",
      dispatchEstimate: "Dispatch target: 1–2 working days",
      caveats: ["Key-head shapes affect practical capacity."],
      restrictionStatus: "none",
    },
    seo: {
      title: "Titan Key System | The Edit",
      description: "A compact adjustable key organiser from The Edit’s representative everyday carry collection.",
    },
  },
  {
    id: "mock-product-field-light",
    handle: "field-light-mini",
    title: "Field Light Mini",
    productType: "Rechargeable light",
    vendor: "The Edit",
    description:
      "A pocket-sized rechargeable light selected for simple controls, usable output and an uncomplicated carry profile.",
    tags: ["flashlight", "light", "tool", "everyday carry"],
    featuredImage: image("sprite-6", "Field Light Mini rechargeable pocket light"),
    images: [
      image("sprite-6", "Field Light Mini, presentation view"),
      image("sprite-6", "Field Light Mini, control detail"),
    ],
    options: [{ name: "Finish", values: ["Black", "Bronze"] }],
    variants: [
      {
        id: "mock-variant-field-black",
        title: "Black",
        availableForSale: true,
        quantityAvailable: 7,
        selectedOptions: [{ name: "Finish", value: "Black" }],
        price: { amount: "3200", currencyCode: "PKR" },
      },
      {
        id: "mock-variant-field-bronze",
        title: "Bronze",
        availableForSale: false,
        quantityAvailable: 0,
        selectedOptions: [{ name: "Finish", value: "Bronze" }],
        price: { amount: "3400", currencyCode: "PKR" },
      },
    ],
    availableForSale: true,
    collectionHandles: ["current-edit", "everyday-carry", "blades-and-tools"],
    editorial: {
      curationNote:
        "Chosen around the practical questions—size, charging, controls and real carry value—before claimed peak output.",
      materials: ["Aluminium body", "Polycarbonate lens"],
      dimensions: "Approximately 7.8 × 2.2 cm",
      fulfillmentModel: "supplier_fulfilled",
      dispatchEstimate: "Dispatch target: 3–5 working days",
      caveats: ["Runtime and output must be verified against the final production batch."],
      careInstructions: "Recharge before long storage and keep the charging port dry.",
      restrictionStatus: "none",
    },
    seo: {
      title: "Field Light Mini | The Edit",
      description: "A compact rechargeable pocket light selected for straightforward everyday utility.",
    },
  },
];

const definitions: Array<Omit<Collection, "products">> = [
  {
    id: "mock-collection-current",
    handle: "current-edit",
    title: "The Current Edit",
    description:
      "The complete representative selection: useful objects, quieter details and buying context that stays honest.",
    note: "Edition 001 · Six representative objects",
    index: "00",
    image: image("sprite-1", "The current curated object selection"),
  },
  {
    id: "mock-collection-edc",
    handle: "everyday-carry",
    title: "Everyday carry",
    description:
      "Compact objects selected around genuine daily utility, sensible materials and an uncomplicated carry footprint.",
    note: "Useful objects, chosen well",
    index: "01",
    image: image("sprite-1", "Everyday carry collection"),
  },
  {
    id: "mock-collection-time",
    handle: "time-and-carry",
    title: "Time & carry",
    description:
      "Watches, wallets and personal essentials edited for restraint, legibility and repeat use.",
    note: "Watches, wallets, essentials",
    index: "02",
    image: image("sprite-2", "Time and carry collection"),
  },
  {
    id: "mock-collection-masks",
    handle: "collector-masks",
    title: "Collector masks",
    description:
      "Display-led pieces selected for silhouette, finish and presence, with their purpose stated clearly.",
    note: "Display pieces with presence",
    index: "03",
    image: image("sprite-4", "Collector masks collection"),
  },
  {
    id: "mock-collection-tools",
    handle: "blades-and-tools",
    title: "Blades & tools",
    description:
      "Utility and collector pieces assessed for construction, handling and the practical context of ownership.",
    note: "Utility and collector pieces",
    index: "04",
    image: image("sprite-6", "Blades and tools collection"),
  },
  {
    id: "mock-collection-under-3000",
    handle: "under-3000",
    title: "Objects under PKR 3,000",
    description:
      "Small, useful additions selected to prove that considered does not need to mean expensive.",
    note: "Accessible finds with a clear use",
    index: "05",
    image: image("sprite-5", "Curated objects under PKR 3,000"),
  },
];

export const mockCollections: Collection[] = definitions.map((collection) => ({
  ...collection,
  products: mockProducts.filter((product) =>
    product.collectionHandles.includes(collection.handle),
  ),
}));
