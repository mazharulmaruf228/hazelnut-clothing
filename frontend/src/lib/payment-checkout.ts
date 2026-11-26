import { z } from "zod";

const storageKey = "hazelnut-payment-checkout";
const checkoutSchema = z.object({
  key: z.string().uuid(),
  fingerprint: z.string(),
  items: z.array(z.object({ variantId: z.string(), quantity: z.number().int().positive(), revision: z.string().optional() })),
  settled: z.boolean(),
  draft: z.boolean().optional(),
  orderId: z.string().uuid().optional(),
});
const storeSchema = z.object({
  version: z.literal(2),
  checkouts: z.array(checkoutSchema),
  guestAccess: z.array(z.object({ orderId: z.string().uuid(), statusToken: z.string().min(1) })),
});

export type PaymentCheckout = z.infer<typeof checkoutSchema>;
type PaymentStore = z.infer<typeof storeSchema>;

function readStore(): PaymentStore {
  const raw = sessionStorage.getItem(storageKey);
  if (!raw) return { version: 2, checkouts: [], guestAccess: [] };
  const data: unknown = JSON.parse(raw);
  const current = storeSchema.safeParse(data);
  if (current.success) return current.data;
  const legacy = checkoutSchema.safeParse(data);
  if (legacy.success) return { version: 2, checkouts: [{ ...legacy.data, draft: false }], guestAccess: [] };
  throw new Error("Saved payment details are unavailable in this browser.");
}

function saveStore(store: PaymentStore) {
  const settledKeys = new Set(
    store.checkouts
      .filter((checkout) => checkout.settled)
      .slice(-100)
      .map((checkout) => checkout.key),
  );
  store.checkouts = store.checkouts.filter((checkout) => !checkout.settled || settledKeys.has(checkout.key));
  sessionStorage.setItem(storageKey, JSON.stringify(store));
}

export function readPaymentCheckouts(): PaymentCheckout[] {
  try {
    return readStore().checkouts;
  } catch {
    return [];
  }
}

export function readPaymentCheckout(orderId?: string): PaymentCheckout | null {
  const checkouts = readPaymentCheckouts();
  if (orderId) return checkouts.find((checkout) => checkout.orderId === orderId) ?? null;
  return checkouts.length === 1 ? checkouts[0] : null;
}

export function readPaymentCheckoutByKey(key: string) {
  return readPaymentCheckouts().find((checkout) => checkout.key === key) ?? null;
}

export function savePaymentCheckout(checkout: PaymentCheckout) {
  const store = readStore();
  const index = store.checkouts.findIndex((item) => item.key === checkout.key);
  if (index >= 0) store.checkouts[index] = checkout;
  else {
    store.checkouts.push(checkout);
  }
  saveStore(store);
}

export function detachPaymentDraft() {
  const store = readStore();
  store.checkouts = store.checkouts.map((checkout) => (checkout.draft ? { ...checkout, draft: false } : checkout));
  saveStore(store);
}

export async function preparePaymentCheckout(input: unknown, items: PaymentCheckout["items"]) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(input)));
  const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const store = readStore();
  const previous = store.checkouts.find((checkout) => checkout.draft && !checkout.settled);
  if (previous?.fingerprint === fingerprint) return previous;
  if (previous) store.checkouts = store.checkouts.map((checkout) => (checkout.key === previous.key ? { ...checkout, draft: false } : checkout));
  const checkout: PaymentCheckout = { key: crypto.randomUUID(), fingerprint, items, settled: false, draft: true };
  store.checkouts.push(checkout);
  saveStore(store);
  return checkout;
}

export function saveGuestPaymentAccess(orderId: string, statusToken: string) {
  const store = readStore();
  store.guestAccess = store.guestAccess.filter((access) => access.orderId !== orderId);
  if (store.guestAccess.length >= 100) store.guestAccess.shift();
  store.guestAccess.push({ orderId, statusToken });
  saveStore(store);
}

export function readGuestPaymentAccess(orderId: string) {
  try {
    return readStore().guestAccess.find((access) => access.orderId === orderId) ?? null;
  } catch {
    return null;
  }
}

export function readGuestPaymentAccesses() {
  try {
    return readStore().guestAccess;
  } catch {
    return [];
  }
}
