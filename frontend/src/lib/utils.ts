import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const money = (value: string | number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(Number(value));
export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export function errorMessage(error: unknown): string {
  if (typeof error === "object" && error && "data" in error) {
    const data = error.data as { error?: { message?: string } };
    if (data?.error?.message) return data.error.message;
  }
  return error instanceof Error ? error.message : "Unable to complete the request. Please try again.";
}
