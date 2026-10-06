import { publicCollections, publicProducts } from "../store/catalogue";
import type { CommerceProvider, ProductSearchInput } from "./types";

export class IndependentCommerceProvider implements CommerceProvider {
  readonly name = "independent" as const;
  async getProducts(input: ProductSearchInput = {}) {
    let products = await publicProducts();
    const query = input.query?.trim().toLowerCase();
    products = products.filter((p) => (!query || [p.title,p.description,p.productType,...p.tags].join(" ").toLowerCase().includes(query)) && (!input.collectionHandle || p.collectionHandles.includes(input.collectionHandle)) && (!input.productType || p.productType === input.productType) && (!input.availableOnly || p.availableForSale) && (input.minPrice === undefined || Number(p.variants[0].price.amount) >= input.minPrice) && (input.maxPrice === undefined || Number(p.variants[0].price.amount) <= input.maxPrice));
    if (input.sort === "price-asc") products.sort((a,b) => Number(a.variants[0].price.amount)-Number(b.variants[0].price.amount));
    if (input.sort === "price-desc") products.sort((a,b) => Number(b.variants[0].price.amount)-Number(a.variants[0].price.amount));
    if (input.sort === "title") products.sort((a,b) => a.title.localeCompare(b.title));
    return products.slice(0,input.first ?? products.length);
  }
  async getProduct(handle: string) { return (await publicProducts()).find((p) => p.handle === handle) ?? null; }
  getCollections() { return publicCollections(); }
  async getCollection(handle: string) { return (await publicCollections()).find((c) => c.handle === handle) ?? null; }
  // The browser bag holds IDs. Checkout reprices and reserves stock atomically.
  async createCart(): Promise<never> { throw new Error("Use the independent checkout endpoint."); }
  async getCart(): Promise<null> { return null; }
  async addCartLines(): Promise<never> { throw new Error("Use the independent checkout endpoint."); }
  async updateCartLines(): Promise<never> { throw new Error("Use the independent checkout endpoint."); }
  async removeCartLines(): Promise<never> { throw new Error("Use the independent checkout endpoint."); }
}
