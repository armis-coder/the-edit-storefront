"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { CartLine, Product, ProductVariant } from "@/lib/commerce/types";

const STORAGE_KEY = "the-edit-bag-v2";

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  isOpen: boolean;
  notice: string;
  checkoutUrl?: string;
  ready: boolean;
  clearCart: () => void;
  addItem: (
    product: Product,
    variant: ProductVariant,
    quantity?: number,
    openAfter?: boolean,
  ) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  removeItem: (lineId: string) => void;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function validStoredLines(value: unknown): value is CartLine[] {
  return (
    Array.isArray(value) &&
    value.every(
      (line) =>
        line &&
        typeof line === "object" &&
        typeof line.id === "string" && typeof line.merchandiseId === "string" &&
        typeof line.quantity === "number" &&
        Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 20 &&
        line.product?.featuredImage && typeof line.product.featuredImage.url === "string" &&
        typeof line.product.title === "string" && typeof line.product.handle === "string" &&
        line.variant?.price && typeof line.variant.price.amount === "string" &&
        Number.isFinite(Number(line.variant.price.amount)) && Number(line.variant.price.amount) > 0 &&
        typeof line.variant.title === "string" && typeof line.variant.price.currencyCode === "string",
    )
  );
}

export function CartProvider({ children, independent = false }: { children: React.ReactNode; independent?: boolean }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if(!active) return;
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        if(validStoredLines(parsed)) setLines(parsed);
      } catch {
        // Private browsing may disable storage; the in-memory bag still works.
      } finally { setHydrated(true); }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Full or blocked device storage must not interrupt the shopping flow.
    }
  }, [hydrated, lines]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const addItem = useCallback(
    (
      product: Product,
      variant: ProductVariant,
      quantity = 1,
      openAfter = false,
    ) => {
      if (!variant.availableForSale) {
        setNotice(`${variant.title} is currently unavailable.`);
        return;
      }

      setLines((current) => {
        const existing = current.find(
          (line) => line.merchandiseId === variant.id,
        );
        const maximum = Math.min(20,variant.quantityAvailable ?? 20);

        if (existing) {
          const nextQuantity = Math.min(existing.quantity + quantity, maximum);
          return current.map((line) =>
            line.id === existing.id
              ? { ...line, quantity: nextQuantity }
              : line,
          );
        }

        return [
          ...current,
          {
            id: `local-${variant.id}`,
            merchandiseId: variant.id,
            quantity: Math.min(quantity, maximum),
            product,
            variant,
          },
        ];
      });

      setNotice(`${product.title} added to your bag.`);
      if (openAfter) setIsOpen(true);
    },
    [],
  );

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    setLines((current) =>
      current
        .map((line) => {
          if (line.id !== lineId) return line;
          const maximum =
            Math.min(20,line.variant.quantityAvailable ?? 20);
          return { ...line, quantity: Math.min(quantity, maximum) };
        })
        .filter((line) => line.quantity > 0),
    );
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setLines((current) => current.filter((line) => line.id !== lineId));
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const clearCart = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = lines.reduce(
      (sum, line) =>
        sum + Number(line.variant.price.amount) * line.quantity,
      0,
    );

    return {
      lines,
      itemCount,
      subtotal,
      isOpen,
      notice,
      ready: hydrated,
      clearCart,
      checkoutUrl: independent ? "/checkout" : undefined,
      addItem,
      updateQuantity,
      removeItem,
      openCart,
      closeCart,
    };
  }, [addItem, isOpen, lines, notice, removeItem, updateQuantity, openCart, closeCart, independent, hydrated, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider.");
  return context;
}
