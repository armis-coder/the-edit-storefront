"use client";

import Link from "next/link";
import { useState } from "react";

import { useCart } from "@/app/commerce/cart-context";
import { firstAvailableVariant, formatMoney } from "@/lib/commerce/format";
import type { Product } from "@/lib/commerce/types";

import { Icon } from "./icons";
import { ProductMedia } from "./product-media";

export function ProductCard({ product }: { product: Product }) {
  const [isSaved, setIsSaved] = useState(false);
  const { addItem } = useCart();
  const variant = firstAvailableVariant(product);
  const price = variant?.price;
  const hasOptions = product.variants.length > 1;
  const hasPriceRange = product.variants.some((item) => item.price.amount !== price?.amount);

  return (
    <article className="product-card">
      <div className="product-image">
        <Link
          className="product-image-link"
          href={`/products/${product.handle}`}
          aria-label={`View ${product.title}`}
        >
          <ProductMedia image={product.featuredImage} />
        </Link>
        {product.badge && <span className="product-tag">{product.badge}</span>}
        <button
          className={`save-button ${isSaved ? "is-saved" : ""}`}
          onClick={() => setIsSaved((saved) => !saved)}
          aria-label={`${isSaved ? "Remove" : "Save"} ${product.title}`}
          aria-pressed={isSaved}
          type="button"
        >
          <Icon name="heart" />
        </button>
        {hasOptions ? (
          <Link className="quick-add" href={`/products/${product.handle}`} aria-label={`Choose options for ${product.title}`}>
            <span>Choose options</span>
          </Link>
        ) : <button
          className="quick-add"
          onClick={() => variant && addItem(product, variant, 1, true)}
          disabled={!variant?.availableForSale}
          type="button"
        >
          <span>{variant?.availableForSale ? "Add to bag" : "Unavailable"}</span>
          <strong aria-hidden="true">+</strong>
        </button>}
      </div>
      <div className="product-details">
        <div>
          <p>{product.productType}</p>
          <h3>
            <Link href={`/products/${product.handle}`}>{product.title}</Link>
          </h3>
        </div>
        {price && <span>{hasPriceRange && <small>From </small>}{formatMoney(price)}</span>}
      </div>
    </article>
  );
}
