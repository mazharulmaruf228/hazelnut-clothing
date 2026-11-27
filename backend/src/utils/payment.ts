import { createHash } from "node:crypto";
import { Decimal } from "decimal.js";

export function paymentHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function minorUnits(value: string) {
  const amount = new Decimal(value).mul(100);
  if (!amount.isInteger() || amount.isNegative() || amount.gt(Number.MAX_SAFE_INTEGER)) throw new Error("Invalid payment amount");
  return amount.toNumber();
}

export function checkoutInputHash(input: Record<string, unknown>) {
  const { checkoutKey: _checkoutKey, ...fields } = input;
  return paymentHash(JSON.stringify(fields, Object.keys(fields).sort().concat(["variantId", "quantity"])));
}
