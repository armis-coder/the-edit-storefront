"use client";

import { useMemo, useState } from "react";

import { useCart } from "./cart-context";
import { firstAvailableVariant, formatMoney, fulfillmentLabel } from "@/lib/commerce/format";
import type { Product, ProductVariant, SelectedOption } from "@/lib/commerce/types";

import { Icon } from "../components/icons";

function sameOptions(variant: ProductVariant, selection: SelectedOption[]) {
  return selection.every((option) =>
    variant.selectedOptions.some(
      (candidate) =>
        candidate.name === option.name && candidate.value === option.value,
    ),
  );
}

export function ProductPurchasePanel({ product, isMock = false }: { product: Product; isMock?: boolean }) {
  const initialVariant = firstAvailableVariant(product);
  const [selection, setSelection] = useState<SelectedOption[]>(
    initialVariant.selectedOptions,
  );
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();

  const selectedVariant = useMemo(
    () =>
      product.variants.find((variant) => sameOptions(variant, selection)) ??
      initialVariant,
    [initialVariant, product.variants, selection],
  );

  function chooseOption(name: string, value: string) {
    setSelection((current) => [
      ...current.filter((option) => option.name !== name),
      { name, value },
    ]);
    setQuantity(1);
  }

  function optionCanResolve(name: string, value: string) {
    const prospective = [
      ...selection.filter((option) => option.name !== name),
      { name, value },
    ];
    return product.variants.some(
      (variant) => sameOptions(variant, prospective) && variant.availableForSale,
    );
  }

  const maximum = selectedVariant.quantityAvailable ?? 20;

  return (
    <div className="purchase-panel">
      <div className="purchase-price-row">
        <span>{formatMoney(selectedVariant.price)}</span>
        {selectedVariant.compareAtPrice && (
          <del>{formatMoney(selectedVariant.compareAtPrice)}</del>
        )}
      </div>

      <div className="availability-line" aria-live="polite">
        <i className={selectedVariant.availableForSale ? "is-available" : ""} />
        <span>
          {selectedVariant.availableForSale
            ? `${fulfillmentLabel(product)} · ${product.editorial.dispatchEstimate}`
            : "This option is currently unavailable"}
        </span>
      </div>

      {product.options.map((option) => (
        <fieldset className="option-group" key={option.name}>
          <legend>{option.name}</legend>
          <div>
            {option.values.map((value) => {
              const chosen = selection.some(
                (item) => item.name === option.name && item.value === value,
              );
              const available = optionCanResolve(option.name, value);
              return (
                <button
                  key={value}
                  className={chosen ? "is-selected" : ""}
                  type="button"
                  onClick={() => chooseOption(option.name, value)}
                  aria-pressed={chosen}
                  disabled={!available && !chosen}
                  data-unavailable={!available || undefined}
                >
                  {value}
                  {!available && <small>Unavailable</small>}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="purchase-actions">
        <div className="quantity-control product-quantity" aria-label="Quantity">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
            disabled={quantity === 1}
          >
            <Icon name="minus" />
          </button>
          <span>{quantity}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity((current) => Math.min(maximum, current + 1))}
            disabled={quantity >= maximum}
          >
            <Icon name="plus" />
          </button>
        </div>
        <button
          className="add-to-cart"
          type="button"
          disabled={!selectedVariant.availableForSale}
          onClick={() => addItem(product, selectedVariant, quantity, true)}
        >
          <span>
            {selectedVariant.availableForSale ? "Add to bag" : "Unavailable"}
          </span>

        </button>
      </div>

      <div className="purchase-assurances">
        <a href="#object-notes">Materials & object notes </a>
      </div>

      {isMock && <p className="purchase-preview-note">Preview catalogue · example stock and prices. No orders are taken.</p>}

      {product.editorial.restrictionStatus !== "none" && (
        <div className="restriction-note">
          <span>Launch review required</span>
          <p>
            Final age, legal, courier and payment eligibility will be confirmed
            before this category can be purchased.
          </p>
        </div>
      )}
    </div>
  );
}
