"use client";

import { useMemo, useState } from "react";

import type { Product, ProductSort } from "@/lib/commerce/types";
import { productPrice } from "@/lib/commerce/format";

import { ProductCard } from "../components/product-card";

export function CollectionBrowser({ products }: { products: Product[] }) {
  const [sort, setSort] = useState<ProductSort>("featured");
  const [productType, setProductType] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const hasFilters = productType !== "all" || availableOnly;
  function resetFilters() {
    setProductType("all");
    setAvailableOnly(false);
  }
  const productTypes = useMemo(
    () => [...new Set(products.map((product) => product.productType))].sort(),
    [products],
  );

  const visible = useMemo(() => {
    let result = products.filter(
      (product) =>
        (productType === "all" || product.productType === productType) &&
        (!availableOnly || product.availableForSale),
    );

    if (sort === "price-asc") {
      result = result.toSorted(
        (a, b) => Number(productPrice(a).amount) - Number(productPrice(b).amount),
      );
    } else if (sort === "price-desc") {
      result = result.toSorted(
        (a, b) => Number(productPrice(b).amount) - Number(productPrice(a).amount),
      );
    } else if (sort === "title") {
      result = result.toSorted((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [availableOnly, productType, products, sort]);

  return (
    <>
      <div className="collection-toolbar">
        <div className="collection-count" role="status" aria-live="polite">
          <span>{String(visible.length).padStart(2, "0")}</span>
          <p>{visible.length === 1 ? "Object" : "Objects"} in this edit</p>
        </div>
        <div className="collection-controls">
          <label>
            <span>Type</span>
            <select
              value={productType}
              onChange={(event) => setProductType(event.target.value)}
            >
              <option value="all">All objects</option>
              {productTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as ProductSort)}
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price · Low to high</option>
              <option value="price-desc">Price · High to low</option>
              <option value="title">Name</option>
            </select>
          </label>
          <label className="availability-filter">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(event) => setAvailableOnly(event.target.checked)}
            />
            <span>Available only</span>
          </label>
        </div>
      </div>

      {hasFilters && <div className="active-filters">
        <span>{productType === "all" ? "All types" : productType}{availableOnly ? " · Available only" : ""}</span>
        <button type="button" onClick={resetFilters}>Clear filters ×</button>
      </div>}

      {visible.length ? (
        <div className="product-grid collection-product-grid">
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="commerce-empty-state">
          <span>NO MATCHES</span>
          <h2>Nothing in this combination.</h2>
          <p>Clear the filters to return to the full edit.</p>
          <button
            type="button"
            onClick={() => {
              setProductType("all");
              setAvailableOnly(false);
              setSort("featured");
            }}
          >
            Reset filters
          </button>
        </div>
      )}
    </>
  );
}
