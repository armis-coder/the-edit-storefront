import type { Money, Product, ProductVariant } from "./types";

export function formatMoney(money: Money): string {
  const amount = Number(money.amount);

  if (money.currencyCode === "PKR") {
    return `PKR ${new Intl.NumberFormat("en-PK", {
      maximumFractionDigits: 0,
    }).format(amount)}`;
  }

  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: money.currencyCode,
  }).format(amount);
}

export function productPrice(product: Product): Money {
  return product.variants[0]?.price ?? { amount: "0", currencyCode: "PKR" };
}

export function firstAvailableVariant(product: Product): ProductVariant {
  return (
    product.variants.find((variant) => variant.availableForSale) ??
    product.variants[0]
  );
}

export function fulfillmentLabel(product: Product): string {
  const labels = {
    in_stock: "Held locally",
    supplier_fulfilled: "Supplier fulfilled",
    preorder: "Pre-order",
  } as const;

  return labels[product.editorial.fulfillmentModel];
}
