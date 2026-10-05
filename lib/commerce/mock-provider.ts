import { mockCollections, mockProducts } from "./mock-data";
import { productPrice } from "./format";
import type {
  Cart,
  CartInputLine,
  CartLine,
  Collection,
  CommerceProvider,
  Product,
  ProductSearchInput,
} from "./types";

function filterAndSort(
  products: Product[],
  input: ProductSearchInput = {},
): Product[] {
  const query = input.query?.trim().toLocaleLowerCase();
  let result = products.filter((product) => {
    const price = Number(productPrice(product).amount);
    const searchable = [
      product.title,
      product.productType,
      product.description,
      product.editorial.curationNote,
      ...product.tags,
      ...product.editorial.materials,
    ]
      .join(" ")
      .toLocaleLowerCase();

    return (
      (!query || searchable.includes(query)) &&
      (!input.collectionHandle ||
        product.collectionHandles.includes(input.collectionHandle)) &&
      (!input.productType || product.productType === input.productType) &&
      (!input.availableOnly || product.availableForSale) &&
      (input.minPrice === undefined || price >= input.minPrice) &&
      (input.maxPrice === undefined || price <= input.maxPrice)
    );
  });

  if (input.sort === "price-asc") {
    result = result.toSorted(
      (a, b) => Number(productPrice(a).amount) - Number(productPrice(b).amount),
    );
  } else if (input.sort === "price-desc") {
    result = result.toSorted(
      (a, b) => Number(productPrice(b).amount) - Number(productPrice(a).amount),
    );
  } else if (input.sort === "title") {
    result = result.toSorted((a, b) => a.title.localeCompare(b.title));
  }

  return result.slice(0, input.first ?? result.length);
}

function cartFromLines(id: string, lines: CartLine[]): Cart {
  const subtotal = lines.reduce(
    (sum, line) => sum + Number(line.variant.price.amount) * line.quantity,
    0,
  );

  return {
    id,
    lines,
    totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: { amount: String(subtotal), currencyCode: "PKR" },
  };
}

function resolveInputLine(line: CartInputLine, index: number): CartLine {
  const product = mockProducts.find((candidate) =>
    candidate.variants.some((variant) => variant.id === line.merchandiseId),
  );
  const variant = product?.variants.find(
    (candidate) => candidate.id === line.merchandiseId,
  );

  if (!product || !variant) {
    throw new Error(`Unknown mock merchandise: ${line.merchandiseId}`);
  }

  return {
    id: `mock-line-${index}-${variant.id}`,
    merchandiseId: variant.id,
    quantity: line.quantity,
    product,
    variant,
  };
}

export class MockCommerceProvider implements CommerceProvider {
  readonly name = "mock" as const;
  private carts = new Map<string, Cart>();

  async getProducts(input?: ProductSearchInput): Promise<Product[]> {
    return filterAndSort(mockProducts, input);
  }

  async getProduct(handle: string): Promise<Product | null> {
    return mockProducts.find((product) => product.handle === handle) ?? null;
  }

  async getCollections(): Promise<Collection[]> {
    return mockCollections;
  }

  async getCollection(handle: string): Promise<Collection | null> {
    return (
      mockCollections.find((collection) => collection.handle === handle) ?? null
    );
  }

  async createCart(lines: CartInputLine[] = []): Promise<Cart> {
    const id = `mock-cart-${crypto.randomUUID()}`;
    const cart = cartFromLines(id, lines.map(resolveInputLine));
    this.carts.set(id, cart);
    return cart;
  }

  async getCart(id: string): Promise<Cart | null> {
    return this.carts.get(id) ?? null;
  }

  async addCartLines(id: string, inputLines: CartInputLine[]): Promise<Cart> {
    const cart = this.carts.get(id) ?? cartFromLines(id, []);
    const lines = [...cart.lines];

    for (const input of inputLines) {
      const existing = lines.find(
        (line) => line.merchandiseId === input.merchandiseId,
      );
      if (existing) {
        existing.quantity += input.quantity;
      } else {
        lines.push(resolveInputLine(input, lines.length));
      }
    }

    const next = cartFromLines(id, lines);
    this.carts.set(id, next);
    return next;
  }

  async updateCartLines(
    id: string,
    updates: Array<{ id: string; quantity: number }>,
  ): Promise<Cart> {
    const cart = this.carts.get(id) ?? cartFromLines(id, []);
    const quantities = new Map(updates.map((line) => [line.id, line.quantity]));
    const lines = cart.lines
      .map((line) => ({
        ...line,
        quantity: quantities.get(line.id) ?? line.quantity,
      }))
      .filter((line) => line.quantity > 0);
    const next = cartFromLines(id, lines);
    this.carts.set(id, next);
    return next;
  }

  async removeCartLines(id: string, lineIds: string[]): Promise<Cart> {
    const cart = this.carts.get(id) ?? cartFromLines(id, []);
    const remove = new Set(lineIds);
    const next = cartFromLines(
      id,
      cart.lines.filter((line) => !remove.has(line.id)),
    );
    this.carts.set(id, next);
    return next;
  }
}
