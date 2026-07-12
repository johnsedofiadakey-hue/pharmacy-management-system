"use client";

import { useCallback, useEffect, useState } from "react";

export type CartLine = { productId: string; name: string; quantity: number; unitPrice: number };

/**
 * Cart state persisted to localStorage so a page refresh or an auth redirect
 * (e.g. checkout → signup → back) never wipes what the customer built up.
 */
export function useStoredCart(storageKey: string) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Hydrating from localStorage must happen in an effect (not a lazy
    // initializer) so server and first client render agree on an empty cart.
    let stored: CartLine[] = [];
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) stored = JSON.parse(raw) as CartLine[];
    } catch {
      /* corrupted cart — start fresh */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored.length > 0) setCart(stored);
     
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify(cart));
  }, [cart, hydrated, storageKey]);

  const addLine = useCallback((line: Omit<CartLine, "quantity">, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === line.productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === line.productId ? { ...l, quantity: l.quantity + quantity } : l
        );
      }
      return [...prev, { ...line, quantity }];
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setCart((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.productId !== productId)
        : prev.map((l) => (l.productId === productId ? { ...l, quantity } : l))
    );
  }, []);

  const removeLine = useCallback((productId: string) => {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const total = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  return { cart, hydrated, addLine, setQuantity, removeLine, clearCart, total };
}
