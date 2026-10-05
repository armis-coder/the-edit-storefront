import { MockCommerceProvider } from "./mock-provider";
import { ShopifyCommerceProvider } from "./shopify-provider";
import type { CommerceProvider } from "./types";

let provider: CommerceProvider | undefined;

export function getCommerceProvider(): CommerceProvider {
  if (provider) return provider;

  provider =
    process.env.COMMERCE_PROVIDER === "shopify"
      ? ShopifyCommerceProvider.fromEnvironment()
      : new MockCommerceProvider();

  return provider;
}

export function activeCommerceProvider(): "mock" | "shopify" {
  return process.env.COMMERCE_PROVIDER === "shopify" ? "shopify" : "mock";
}
