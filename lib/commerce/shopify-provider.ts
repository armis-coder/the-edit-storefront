import type {
  Cart,
  CartInputLine,
  CartLine,
  Collection,
  CommerceImage,
  CommerceProvider,
  Money,
  Product,
  ProductEditorial,
  ProductSearchInput,
  ProductVariant,
} from "./types";

type ShopifyConfig = {
  storeDomain: string;
  accessToken: string;
  tokenType: "private" | "public";
  apiVersion: string;
};

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

type ShopifyMoney = { amount: string; currencyCode: string };
type ShopifyImage = {
  url: string;
  altText: string | null;
  width?: number;
  height?: number;
};
type ShopifyMetafield = {
  namespace: string;
  key: string;
  value: string;
} | null;

type ShopifyVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  quantityAvailable?: number | null;
  selectedOptions: Array<{ name: string; value: string }>;
  price: ShopifyMoney;
  compareAtPrice?: ShopifyMoney | null;
};

type ShopifyProduct = {
  id: string;
  handle: string;
  title: string;
  productType: string;
  vendor: string;
  description: string;
  tags: string[];
  availableForSale: boolean;
  featuredImage?: ShopifyImage | null;
  images: { nodes: ShopifyImage[] };
  options: Array<{ name: string; values: string[] }>;
  variants: { nodes: ShopifyVariant[] };
  collections?: { nodes: Array<{ handle: string }> };
  metafields: ShopifyMetafield[];
  seo?: { title?: string | null; description?: string | null };
};

type ShopifyCollection = {
  id: string;
  handle: string;
  title: string;
  description: string;
  image?: ShopifyImage | null;
  products: { nodes: ShopifyProduct[] };
};

type ShopifyCart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { subtotalAmount: ShopifyMoney };
  lines: {
    nodes: Array<{
      id: string;
      quantity: number;
      merchandise: ShopifyVariant & { product: ShopifyProduct };
    }>;
  };
};

const METAFIELD_IDENTIFIERS = [
  { namespace: "custom", key: "curation_note" },
  { namespace: "custom", key: "materials" },
  { namespace: "custom", key: "dimensions" },
  { namespace: "custom", key: "fulfillment_model" },
  { namespace: "custom", key: "dispatch_estimate" },
  { namespace: "custom", key: "product_caveats" },
  { namespace: "custom", key: "care_instructions" },
  { namespace: "custom", key: "restriction_status" },
] as const;

const PRODUCT_FRAGMENT = `
  fragment TheEditProduct on Product {
    id
    handle
    title
    productType
    vendor
    description
    tags
    availableForSale
    featuredImage { url altText width height }
    images(first: 8) { nodes { url altText width height } }
    options { name values }
    variants(first: 100) {
      nodes {
        id
        title
        availableForSale
        quantityAvailable
        selectedOptions { name value }
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
      }
    }
    collections(first: 20) { nodes { handle } }
    metafields(identifiers: [
      { namespace: "custom", key: "curation_note" }
      { namespace: "custom", key: "materials" }
      { namespace: "custom", key: "dimensions" }
      { namespace: "custom", key: "fulfillment_model" }
      { namespace: "custom", key: "dispatch_estimate" }
      { namespace: "custom", key: "product_caveats" }
      { namespace: "custom", key: "care_instructions" }
      { namespace: "custom", key: "restriction_status" }
    ]) { namespace key value }
    seo { title description }
  }
`;

const CART_FRAGMENT = `
  fragment TheEditCart on Cart {
    id
    checkoutUrl
    totalQuantity
    cost { subtotalAmount { amount currencyCode } }
    lines(first: 100) {
      nodes {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
            title
            availableForSale
            quantityAvailable
            selectedOptions { name value }
            price { amount currencyCode }
            compareAtPrice { amount currencyCode }
            product { ...TheEditProduct }
          }
        }
      }
    }
  }
`;

function arrayValue(value?: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function imageFromShopify(image: ShopifyImage | null | undefined): CommerceImage {
  return {
    url: image?.url ?? "/product-sprite.png",
    altText: image?.altText ?? "Curated object",
    width: image?.width,
    height: image?.height,
  };
}

function moneyFromShopify(money: ShopifyMoney): Money {
  return { amount: money.amount, currencyCode: money.currencyCode };
}

function variantFromShopify(variant: ShopifyVariant): ProductVariant {
  return {
    id: variant.id,
    title: variant.title,
    availableForSale: variant.availableForSale,
    quantityAvailable: variant.quantityAvailable ?? undefined,
    selectedOptions: variant.selectedOptions,
    price: moneyFromShopify(variant.price),
    compareAtPrice: variant.compareAtPrice
      ? moneyFromShopify(variant.compareAtPrice)
      : undefined,
  };
}

function editorialFromMetafields(fields: ShopifyMetafield[]): ProductEditorial {
  const byKey = new Map(
    fields.filter(Boolean).map((field) => [field!.key, field!.value]),
  );
  const fulfillment = byKey.get("fulfillment_model");
  const restriction = byKey.get("restriction_status");

  return {
    curationNote:
      byKey.get("curation_note") ??
      "Selected against The Edit’s standards for purpose, construction and value.",
    materials: arrayValue(byKey.get("materials")),
    dimensions: byKey.get("dimensions") ?? "Details to be confirmed",
    fulfillmentModel:
      fulfillment === "supplier_fulfilled" || fulfillment === "preorder"
        ? fulfillment
        : "in_stock",
    dispatchEstimate:
      byKey.get("dispatch_estimate") ?? "Dispatch estimate shown at checkout",
    caveats: arrayValue(byKey.get("product_caveats")),
    careInstructions: byKey.get("care_instructions"),
    restrictionStatus:
      restriction === "18_plus" || restriction === "review_before_launch"
        ? restriction
        : "none",
  };
}

function productFromShopify(product: ShopifyProduct): Product {
  const images = product.images.nodes.map(imageFromShopify);
  const featuredImage = imageFromShopify(
    product.featuredImage ?? product.images.nodes[0],
  );

  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    productType: product.productType,
    vendor: product.vendor,
    description: product.description,
    tags: product.tags,
    featuredImage,
    images: images.length ? images : [featuredImage],
    options: product.options,
    variants: product.variants.nodes.map(variantFromShopify),
    availableForSale: product.availableForSale,
    collectionHandles: product.collections?.nodes.map(({ handle }) => handle) ?? [],
    editorial: editorialFromMetafields(product.metafields),
    seo: {
      title: product.seo?.title || `${product.title} | The Edit`,
      description: product.seo?.description || product.description,
    },
  };
}

function collectionFromShopify(collection: ShopifyCollection): Collection {
  return {
    id: collection.id,
    handle: collection.handle,
    title: collection.title,
    description: collection.description,
    note: `${collection.products.nodes.length} objects`,
    index: "—",
    image: imageFromShopify(
      collection.image ?? collection.products.nodes[0]?.featuredImage,
    ),
    products: collection.products.nodes.map(productFromShopify),
  };
}

function cartFromShopify(cart: ShopifyCart): Cart {
  const lines: CartLine[] = cart.lines.nodes.map((line) => ({
    id: line.id,
    merchandiseId: line.merchandise.id,
    quantity: line.quantity,
    product: productFromShopify(line.merchandise.product),
    variant: variantFromShopify(line.merchandise),
  }));

  return {
    id: cart.id,
    checkoutUrl: cart.checkoutUrl,
    totalQuantity: cart.totalQuantity,
    subtotal: moneyFromShopify(cart.cost.subtotalAmount),
    lines,
  };
}

export class ShopifyCommerceProvider implements CommerceProvider {
  readonly name = "shopify" as const;

  constructor(private readonly config: ShopifyConfig) {}

  static fromEnvironment(): ShopifyCommerceProvider {
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const privateToken = process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN;
    const publicToken = process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN;

    if (!storeDomain || (!privateToken && !publicToken)) {
      throw new Error(
        "Shopify commerce is enabled but SHOPIFY_STORE_DOMAIN and a Storefront token are not configured.",
      );
    }

    return new ShopifyCommerceProvider({
      storeDomain: storeDomain.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      accessToken: privateToken ?? publicToken!,
      tokenType: privateToken ? "private" : "public",
      apiVersion: process.env.SHOPIFY_STOREFRONT_API_VERSION ?? "2026-07",
    });
  }

  private async request<T>(query: string, variables: object = {}): Promise<T> {
    const tokenHeader =
      this.config.tokenType === "private"
        ? "Shopify-Storefront-Private-Token"
        : "X-Shopify-Storefront-Access-Token";
    const response = await fetch(
      `https://${this.config.storeDomain}/api/${this.config.apiVersion}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [tokenHeader]: this.config.accessToken,
        },
        body: JSON.stringify({ query, variables }),
      },
    );
    const payload = (await response.json()) as GraphQLResponse<T>;

    if (!response.ok || payload.errors?.length || !payload.data) {
      throw new Error(
        payload.errors?.map((error) => error.message).join("; ") ||
          `Shopify Storefront request failed (${response.status}).`,
      );
    }

    return payload.data;
  }

  async getProducts(input: ProductSearchInput = {}): Promise<Product[]> {
    let products: Product[];

    if (input.collectionHandle) {
      products =
        (await this.getCollection(input.collectionHandle))?.products ?? [];
    } else {
      const safeProductType = input.productType?.replaceAll("'", "\\'");
      const filters = [
        input.query,
        safeProductType && `product_type:'${safeProductType}'`,
      ]
        .filter(Boolean)
        .join(" AND ");
      const data = await this.request<{ products: { nodes: ShopifyProduct[] } }>(
        `${PRODUCT_FRAGMENT}
         query Products($first: Int!, $query: String) {
           products(first: $first, query: $query) { nodes { ...TheEditProduct } }
         }`,
        { first: input.first ?? 24, query: filters || null },
      );
      products = data.products.nodes.map(productFromShopify);
    }

    if (input.query && input.collectionHandle) {
      const query = input.query.toLocaleLowerCase();
      products = products.filter((product) =>
        [product.title, product.productType, product.description, ...product.tags]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query),
      );
    }
    if (input.productType) {
      products = products.filter(
        (product) => product.productType === input.productType,
      );
    }
    if (input.availableOnly) {
      products = products.filter((product) => product.availableForSale);
    }
    if (input.minPrice !== undefined) {
      products = products.filter(
        (product) => Number(product.variants[0]?.price.amount ?? 0) >= input.minPrice!,
      );
    }
    if (input.maxPrice !== undefined) {
      products = products.filter(
        (product) => Number(product.variants[0]?.price.amount ?? 0) <= input.maxPrice!,
      );
    }

    if (input.sort === "price-asc") {
      products = products.toSorted(
        (a, b) =>
          Number(a.variants[0]?.price.amount ?? 0) -
          Number(b.variants[0]?.price.amount ?? 0),
      );
    } else if (input.sort === "price-desc") {
      products = products.toSorted(
        (a, b) =>
          Number(b.variants[0]?.price.amount ?? 0) -
          Number(a.variants[0]?.price.amount ?? 0),
      );
    } else if (input.sort === "title") {
      products = products.toSorted((a, b) => a.title.localeCompare(b.title));
    }

    return products.slice(0, input.first ?? products.length);
  }

  async getProduct(handle: string): Promise<Product | null> {
    const data = await this.request<{ product: ShopifyProduct | null }>(
      `${PRODUCT_FRAGMENT}
       query Product($handle: String!) {
         product(handle: $handle) { ...TheEditProduct }
       }`,
      { handle },
    );
    return data.product ? productFromShopify(data.product) : null;
  }

  async getCollections(): Promise<Collection[]> {
    const data = await this.request<{
      collections: { nodes: ShopifyCollection[] };
    }>(
      `${PRODUCT_FRAGMENT}
       query Collections {
         collections(first: 24) {
           nodes {
             id handle title description image { url altText width height }
             products(first: 24) { nodes { ...TheEditProduct } }
           }
         }
       }`,
    );
    return data.collections.nodes.map(collectionFromShopify);
  }

  async getCollection(handle: string): Promise<Collection | null> {
    const data = await this.request<{ collection: ShopifyCollection | null }>(
      `${PRODUCT_FRAGMENT}
       query Collection($handle: String!) {
         collection(handle: $handle) {
           id handle title description image { url altText width height }
           products(first: 100) { nodes { ...TheEditProduct } }
         }
       }`,
      { handle },
    );
    return data.collection ? collectionFromShopify(data.collection) : null;
  }

  async createCart(lines: CartInputLine[] = []): Promise<Cart> {
    const data = await this.request<{
      cartCreate: { cart: ShopifyCart | null; userErrors: Array<{ message: string }> };
    }>(
      `${PRODUCT_FRAGMENT}${CART_FRAGMENT}
       mutation CartCreate($input: CartInput!) {
         cartCreate(input: $input) {
           cart { ...TheEditCart }
           userErrors { message }
         }
       }`,
      { input: { lines } },
    );
    return this.unwrapCart(data.cartCreate);
  }

  async getCart(id: string): Promise<Cart | null> {
    const data = await this.request<{ cart: ShopifyCart | null }>(
      `${PRODUCT_FRAGMENT}${CART_FRAGMENT}
       query Cart($id: ID!) { cart(id: $id) { ...TheEditCart } }`,
      { id },
    );
    return data.cart ? cartFromShopify(data.cart) : null;
  }

  async addCartLines(id: string, lines: CartInputLine[]): Promise<Cart> {
    const data = await this.request<{
      cartLinesAdd: { cart: ShopifyCart | null; userErrors: Array<{ message: string }> };
    }>(
      `${PRODUCT_FRAGMENT}${CART_FRAGMENT}
       mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
         cartLinesAdd(cartId: $cartId, lines: $lines) {
           cart { ...TheEditCart }
           userErrors { message }
         }
       }`,
      { cartId: id, lines },
    );
    return this.unwrapCart(data.cartLinesAdd);
  }

  async updateCartLines(
    id: string,
    lines: Array<{ id: string; quantity: number }>,
  ): Promise<Cart> {
    const data = await this.request<{
      cartLinesUpdate: { cart: ShopifyCart | null; userErrors: Array<{ message: string }> };
    }>(
      `${PRODUCT_FRAGMENT}${CART_FRAGMENT}
       mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
         cartLinesUpdate(cartId: $cartId, lines: $lines) {
           cart { ...TheEditCart }
           userErrors { message }
         }
       }`,
      { cartId: id, lines },
    );
    return this.unwrapCart(data.cartLinesUpdate);
  }

  async removeCartLines(id: string, lineIds: string[]): Promise<Cart> {
    const data = await this.request<{
      cartLinesRemove: { cart: ShopifyCart | null; userErrors: Array<{ message: string }> };
    }>(
      `${PRODUCT_FRAGMENT}${CART_FRAGMENT}
       mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
         cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
           cart { ...TheEditCart }
           userErrors { message }
         }
       }`,
      { cartId: id, lineIds },
    );
    return this.unwrapCart(data.cartLinesRemove);
  }

  private unwrapCart(payload: {
    cart: ShopifyCart | null;
    userErrors: Array<{ message: string }>;
  }): Cart {
    if (payload.userErrors.length || !payload.cart) {
      throw new Error(
        payload.userErrors.map((error) => error.message).join("; ") ||
          "Shopify did not return a cart.",
      );
    }
    return cartFromShopify(payload.cart);
  }
}

export { METAFIELD_IDENTIFIERS };
