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

const STORAGE_KEY = "the-edit-mock-cart-v1";

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  isOpen: boolean;
  notice: string;
  checkoutUrl?: string;
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
        typeof line.id === "string" &&
        typeof line.quantity === "number" &&
        line.product &&
        line.variant,
    )
  );
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      if (validStoredLines(parsed)) setLines(parsed);
    } catch {
      // Private browsing may disable storage; the in-memory bag still works.
    } finally {
      setHydrated(true);
    }
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
        const maximum = variant.quantityAvailable ?? Number.POSITIVE_INFINITY;

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
            line.variant.quantityAvailable ?? Number.POSITIVE_INFINITY;
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
      addItem,
      updateQuantity,
      removeItem,
      openCart,
      closeCart,
    };
  }, [addItem, isOpen, lines, notice, removeItem, updateQuantity, openCart, closeCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider.");
  return context;
}
