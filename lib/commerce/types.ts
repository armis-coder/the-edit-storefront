export type CurrencyCode = "PKR" | string;

export type Money = {
  amount: string;
  currencyCode: CurrencyCode;
};

export type CommerceImage = {
  url: string;
  altText: string;
  width?: number;
  height?: number;
  /** Keeps the current prototype sprite useful until Shopify images replace it. */
  crop?: `sprite-${1 | 2 | 3 | 4 | 5 | 6}`;
};

export type SelectedOption = {
  name: string;
  value: string;
};

export type ProductVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  quantityAvailable?: number;
  selectedOptions: SelectedOption[];
  price: Money;
  compareAtPrice?: Money;
};

export type ProductOption = {
  name: string;
  values: string[];
};

export type FulfillmentModel =
  | "in_stock"
  | "supplier_fulfilled"
  | "preorder";

export type RestrictionStatus = "none" | "review_before_launch" | "18_plus";

export type ProductEditorial = {
  curationNote: string;
  materials: string[];
  dimensions: string;
  fulfillmentModel: FulfillmentModel;
  dispatchEstimate: string;
  caveats: string[];
  careInstructions?: string;
  restrictionStatus: RestrictionStatus;
};

export type Product = {
  id: string;
  handle: string;
  title: string;
  productType: string;
  vendor: string;
  description: string;
  tags: string[];
  badge?: string;
  featuredImage: CommerceImage;
  images: CommerceImage[];
  options: ProductOption[];
  variants: ProductVariant[];
  availableForSale: boolean;
  collectionHandles: string[];
  editorial: ProductEditorial;
  seo: {
    title: string;
    description: string;
  };
};

export type Collection = {
  id: string;
  handle: string;
  title: string;
  description: string;
  note: string;
  index: string;
  image: CommerceImage;
  products: Product[];
};

export type ProductSort = "featured" | "price-asc" | "price-desc" | "title";

export type ProductSearchInput = {
  query?: string;
  collectionHandle?: string;
  productType?: string;
  availableOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
  first?: number;
};

export type CartInputLine = {
  merchandiseId: string;
  quantity: number;
};

export type CartLine = {
  id: string;
  merchandiseId: string;
  quantity: number;
  product: Product;
  variant: ProductVariant;
};

export type Cart = {
  id: string;
  lines: CartLine[];
  totalQuantity: number;
  subtotal: Money;
  checkoutUrl?: string;
};

export interface CommerceProvider {
  readonly name: "mock" | "shopify" | "independent";
  getProducts(input?: ProductSearchInput): Promise<Product[]>;
  getProduct(handle: string): Promise<Product | null>;
  getCollections(): Promise<Collection[]>;
  getCollection(handle: string): Promise<Collection | null>;
  createCart(lines?: CartInputLine[]): Promise<Cart>;
  getCart(id: string): Promise<Cart | null>;
  addCartLines(id: string, lines: CartInputLine[]): Promise<Cart>;
  updateCartLines(
    id: string,
    lines: Array<{ id: string; quantity: number }>,
  ): Promise<Cart>;
  removeCartLines(id: string, lineIds: string[]): Promise<Cart>;
}
