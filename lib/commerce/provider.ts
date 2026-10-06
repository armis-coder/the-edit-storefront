import { MockCommerceProvider } from "./mock-provider";
import { ShopifyCommerceProvider } from "./shopify-provider";
import { IndependentCommerceProvider } from "./independent-provider";
import type { CommerceProvider } from "./types";

let provider: CommerceProvider | undefined;

export function getCommerceProvider(): CommerceProvider {
  if (provider) return provider;

  provider =
    process.env.COMMERCE_PROVIDER === "independent"
      ? new IndependentCommerceProvider()
      : process.env.COMMERCE_PROVIDER === "shopify"
      ? ShopifyCommerceProvider.fromEnvironment()
      : new MockCommerceProvider();

  return provider;
}

export function activeCommerceProvider(): "mock" | "shopify" | "independent" {
  return process.env.COMMERCE_PROVIDER === "independent" ? "independent" : process.env.COMMERCE_PROVIDER === "shopify" ? "shopify" : "mock";
}
