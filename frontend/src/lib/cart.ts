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
  revision?: string;
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
        (line.revision === undefined || typeof line.revision === "string") &&
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
  return updateCart(() => {
    const settled = settledOrders();
    if (settled.includes(orderId)) return;
    const quantities = new Map(purchased.map((line) => [line.variantId, line.quantity]));
    const remaining = readCart().flatMap((line) => {
      const quantity = line.quantity - (quantities.get(line.variantId) ?? 0);
      return quantity > 0 ? [{ ...line, quantity }] : [];
    });
    saveCart(remaining, [...settled, orderId]);
  });
}

function updateCart<T>(operation: () => T): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) return navigator.locks.request("hazelnut-cart", operation);
  try {
    return Promise.resolve(operation());
  } catch (error) {
    return Promise.reject(error);
  }
}

function revision() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function addCartLine(line: CartLine) {
  return updateCart(() => {
    const maximum = Math.max(0, Math.min(20, line.availableQuantity ?? 20));
    if (!maximum) return;
    const lines = readCart();
    const existing = lines.find((item) => item.variantId === line.variantId);
    if (existing) {
      existing.availableQuantity = Math.min(existing.availableQuantity ?? 20, maximum);
      existing.quantity = Math.min(existing.availableQuantity, existing.quantity + line.quantity);
      existing.revision = revision();
    } else {
      lines.push({ ...line, quantity: Math.min(maximum, line.quantity), revision: revision() });
    }
    saveCart(lines);
  });
}

export function setCartQuantity(variantId: string, quantity: number) {
  return updateCart(() =>
    saveCart(
      readCart().flatMap((line) => {
        if (line.variantId !== variantId) return [line];
        const maximum = Math.min(20, line.availableQuantity ?? 20);
        const next = Math.max(1, Math.min(maximum, quantity));
        return maximum ? [{ ...line, quantity: next, revision: next === line.quantity ? line.revision : revision() }] : [];
      }),
    ),
  );
}

export function removeCartLine(variantId: string) {
  return updateCart(() => saveCart(readCart().filter((line) => line.variantId !== variantId)));
}

export function clearCart() {
  return updateCart(() => saveCart([]));
}

export async function captureCartSnapshot(items: { variantId: string; quantity: number }[]) {
  if (typeof navigator === "undefined" || !navigator.locks) return [];
  return updateCart(() => {
    const cart = readCart();
    if (items.some((item) => !cart.some((line) => line.variantId === item.variantId && line.quantity === item.quantity))) throw new Error("Your bag changed. Please review it before placing the order.");
    let updated = false;
    const snapshot = items.map((item) => {
      const line = cart.find((entry) => entry.variantId === item.variantId)!;
      if (!line.revision) {
        line.revision = revision();
        updated = true;
      }
      return { ...item, revision: line.revision };
    });
    if (updated) saveCart(cart);
    return snapshot;
  });
}

export async function removePurchasedQuantities(items: { variantId: string; quantity: number; revision?: string }[]) {
  if (typeof navigator === "undefined" || !navigator.locks) return;
  await updateCart(() => {
    const purchased = new Map(items.filter((item) => item.revision).map((item) => [item.variantId, item]));
    saveCart(
      readCart().filter((line) => {
        const item = purchased.get(line.variantId);
        return !item || line.revision !== item.revision || line.quantity !== item.quantity;
      }),
    );
  });
}

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);
  useEffect(() => {
    const refresh = () => setLines(readCart());
    refresh();
    window.addEventListener(changeEvent, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(changeEvent, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return { lines, count: lines.reduce((total, line) => total + line.quantity, 0) };
}
