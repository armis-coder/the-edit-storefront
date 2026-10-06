"use client";

import Link from "next/link";
import { useCart } from "@/app/commerce/cart-context";
import { useModalDialog } from "@/app/commerce/use-modal-dialog";
import { formatMoney } from "@/lib/commerce/format";

import { Icon } from "./icons";
import { ProductMedia } from "./product-media";

export function CartDrawer() {
  const {
    lines,
    itemCount,
    subtotal,
    isOpen,
    notice,
    checkoutUrl,
    closeCart,
    updateQuantity,
    removeItem,
  } = useCart();
  const dialogRef = useModalDialog(isOpen);

  return (
    <>
      <dialog ref={dialogRef} className={`cart-drawer ${isOpen ? "is-open" : ""}`} aria-labelledby="cart-title" onCancel={closeCart}>
        <button
          className="cart-backdrop"
          aria-label="Close shopping bag"
          onClick={closeCart}
          type="button"
          tabIndex={-1}
        />
        <aside
          className="cart-panel"
        >
          <div className="cart-header">
            <div>
              <span>YOUR SELECTION</span>
              <h2 id="cart-title">The bag <span className="cart-count">{String(itemCount).padStart(2, "0")}</span></h2>
            </div>
            <button
              data-dialog-focus
              className="icon-button"
              aria-label="Close shopping bag"
              onClick={closeCart}
              type="button"
            >
              <Icon name="close" />
            </button>
          </div>

          {lines.length === 0 ? (
            <div className="cart-empty">
              <span>00 / OBJECTS</span>
              <h3>Nothing added yet.</h3>
              <p>
                The collection stays deliberately small. Start with the current
                edit and keep only what earns a place.
              </p>
              <Link href="/collections/current-edit" onClick={closeCart}>
                Explore the edit
              </Link>
            </div>
          ) : (
            <>
              <div className="cart-lines">
                {lines.map((line) => (
                  <article className="cart-line" key={line.id}>
                    <Link
                      className="cart-line-image"
                      href={`/products/${line.product.handle}`}
                      onClick={closeCart}
                    >
                      <ProductMedia image={line.product.featuredImage} />
                    </Link>
                    <div className="cart-line-copy">
                      <span>{line.product.productType}</span>
                      <h3>
                        <Link
                          href={`/products/${line.product.handle}`}
                          onClick={closeCart}
                        >
                          {line.product.title}
                        </Link>
                      </h3>
                      <p>{line.variant.title}</p>
                      <div className="cart-line-controls">
                        <div className="quantity-control" aria-label="Quantity">
                          <button
                            type="button"
                            aria-label={`Decrease ${line.product.title} quantity`}
                            onClick={() =>
                              updateQuantity(line.id, line.quantity - 1)
                            }
                          >
                            <Icon name="minus" />
                          </button>
                          <span>{line.quantity}</span>
                          <button
                            type="button"
                            aria-label={`Increase ${line.product.title} quantity`}
                            onClick={() =>
                              updateQuantity(line.id, line.quantity + 1)
                            }
                            disabled={
                              line.variant.quantityAvailable !== undefined &&
                              line.quantity >= line.variant.quantityAvailable
                            }
                          >
                            <Icon name="plus" />
                          </button>
                        </div>
                        <button
                          className="cart-remove"
                          type="button"
                          onClick={() => removeItem(line.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <strong>
                      {formatMoney({
                        amount: String(
                          Number(line.variant.price.amount) * line.quantity,
                        ),
                        currencyCode: line.variant.price.currencyCode,
                      })}
                    </strong>
                  </article>
                ))}
              </div>

              <div className="cart-summary">
                <div>
                  <span>Subtotal · {itemCount} {itemCount === 1 ? "object" : "objects"}</span>
                  <strong>
                    {formatMoney({ amount: String(subtotal), currencyCode: "PKR" })}
                  </strong>
                </div>
                <p>{checkoutUrl ? "Delivery is calculated at checkout." : "This is a preview bag. Products and prices are examples; checkout is not active."}</p>
                {checkoutUrl ? (
                  <a className="cart-checkout" href={checkoutUrl} onClick={closeCart}>
                    Continue to secure checkout
                  </a>
                ) : (
                  <button className="cart-checkout" type="button" disabled>
                    Checkout unavailable
                  </button>
                )}
                <button type="button" className="cart-continue" onClick={closeCart}>Continue browsing</button>
                {!checkoutUrl && <small>No order or payment will be created</small>}
              </div>
            </>
          )}
        </aside>
      </dialog>
      <div
        className={`toast ${notice ? "is-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {notice}
        <span>Bag · {itemCount}</span>
      </div>
    </>
  );
}
