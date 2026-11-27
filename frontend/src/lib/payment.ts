"use client";

import { z } from "zod";
import { settlePaidCart } from "./cart";

const attemptSchema = z.object({
  key: z.uuid(),
  fingerprint: z.string(),
  orderId: z.string().optional(),
  createdAt: z.number(),
  finalized: z.boolean().default(false),
  items: z.array(z.object({ variantId: z.string(), quantity: z.number().int().positive() })),
});
type Attempt = z.infer<typeof attemptSchema>;
const storageKey = "stripe-checkout-attempt";

export function storedPaymentAttempt(): Attempt | null {
  try {
    const parsed = attemptSchema.safeParse(JSON.parse(sessionStorage.getItem(storageKey) || "null"));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function preparePaymentAttempt(fields: Record<string, unknown>, items: Attempt["items"]) {
  const fingerprint = JSON.stringify(fields);
  const previous = storedPaymentAttempt();
  if (previous?.fingerprint === fingerprint && !previous.finalized) return previous;
  const attempt = { key: crypto.randomUUID(), fingerprint, items, createdAt: Date.now(), finalized: false };
  sessionStorage.setItem(storageKey, JSON.stringify(attempt));
  return attempt;
}

export function savePaymentOrder(attempt: Attempt, orderId: string) {
  sessionStorage.setItem(storageKey, JSON.stringify({ ...attempt, orderId }));
}

export function completePaidCart(orderId: string) {
  const attempt = storedPaymentAttempt();
  if (attempt?.orderId === orderId) {
    settlePaidCart(orderId, attempt.items);
    finalizePaymentAttempt(orderId);
  }
}

export function finalizePaymentAttempt(orderId: string) {
  const attempt = storedPaymentAttempt();
  if (attempt?.orderId === orderId) sessionStorage.setItem(storageKey, JSON.stringify({ ...attempt, finalized: true }));
}
