"use client";

import { useEffect, useState } from "react";

const storageKey = "hazelnut-cart";
const changeEvent = "store-cart-change";

export type CartLine = {
  variantId: string;
  productId: string;
  slug: string;
  productName: string;
  variantName: string;
  sku: string;
  unitPrice: string;
  imageUrl: string;
  availableQuantity?: number;
  quantity: number;
};

function readCart(): CartLine[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey) || "[]");
    const lines = Array.isArray(stored) ? stored : typeof stored === "object" && stored !== null && "lines" in stored ? stored.lines : [];
    if (!Array.isArray(lines)) return [];
    return lines.filter(
      (line): line is CartLine =>
        !!line &&
        typeof line.variantId === "string" &&
        typeof line.productId === "string" &&
        typeof line.slug === "string" &&
        typeof line.productName === "string" &&
        typeof line.variantName === "string" &&
        typeof line.sku === "string" &&
        typeof line.unitPrice === "string" &&
        typeof line.imageUrl === "string" &&
        (line.availableQuantity === undefined || (Number.isInteger(line.availableQuantity) && line.availableQuantity >= 0)) &&
        Number.isInteger(line.quantity) &&
        line.quantity > 0 &&
        line.quantity <= 20,
    );
  } catch {
    return [];
  }
}

function settledOrders(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(stored.settledOrders) ? stored.settledOrders.filter((id: unknown) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function saveCart(lines: CartLine[], settled = settledOrders()) {
  localStorage.setItem(storageKey, JSON.stringify(settled.length ? { lines, settledOrders: settled } : lines));
  window.dispatchEvent(new Event(changeEvent));
}

export function settlePaidCart(orderId: string, purchased: { variantId: string; quantity: number }[]) {
  const settled = settledOrders();
  if (settled.includes(orderId)) return;
  const quantities = new Map(purchased.map((line) => [line.variantId, line.quantity]));
  const remaining = readCart().flatMap((line) => {
    const quantity = line.quantity - (quantities.get(line.variantId) ?? 0);
    return quantity > 0 ? [{ ...line, quantity }] : [];
  });
  saveCart(remaining, [...settled, orderId]);
}

export function addCartLine(line: CartLine) {
  const maximum = Math.max(0, Math.min(20, line.availableQuantity ?? 20));
  if (!maximum) return;
  const lines = readCart();
  const existing = lines.find((item) => item.variantId === line.variantId);
  if (existing) {
    existing.availableQuantity = Math.min(existing.availableQuantity ?? 20, maximum);
    existing.quantity = Math.min(existing.availableQuantity, existing.quantity + line.quantity);
  } else {
    lines.push({ ...line, quantity: Math.min(maximum, line.quantity) });
  }
  saveCart(lines);
}

export function setCartQuantity(variantId: string, quantity: number) {
  saveCart(
    readCart().flatMap((line) => {
      if (line.variantId !== variantId) return [line];
      const maximum = Math.min(20, line.availableQuantity ?? 20);
      return maximum ? [{ ...line, quantity: Math.max(1, Math.min(maximum, quantity)) }] : [];
    }),
  );
}

export function removeCartLine(variantId: string) {
  saveCart(readCart().filter((line) => line.variantId !== variantId));
}

export function clearCart() {
  saveCart([]);
}

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);
  useEffect(() => {
    const refresh = () => setLines(readCart());
    refresh();
    window.addEventListener(changeEvent, refresh);
    return () => window.removeEventListener(changeEvent, refresh);
  }, []);
  return { lines, count: lines.reduce((total, line) => total + line.quantity, 0) };
}
