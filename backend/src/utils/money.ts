import { Decimal } from "decimal.js";

export function effectivePrice(base: string, override: string | null, discount: string): string {
  return new Decimal(override ?? base).mul(new Decimal(100).minus(discount)).div(100).toFixed(2, Decimal.ROUND_HALF_UP);
}

export function attributeKey(attributes: Record<string, string>): string {
  return JSON.stringify(
    Object.entries(attributes)
      .map(([key, value]) => [key.trim().toLowerCase(), value.trim().toLowerCase()])
      .sort(([first], [second]) => first.localeCompare(second)),
  );
}
