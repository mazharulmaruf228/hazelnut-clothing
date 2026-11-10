"use client";

import { Suspense, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { orderReceiptSchema, type OrderReceipt } from "@/schemas/api";
import { money } from "@/lib/utils";

function subscribeToReceipt(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getStoredReceipt() {
  try {
    return sessionStorage.getItem("latest-order-receipt") ?? "";
  } catch {
    return "";
  }
}

export default function OrderPlacedPage() {
  return (
    <Suspense fallback={<section className="mx-auto grid min-h-[55vh] place-items-center px-6 py-[100px]">Loading your receipt...</section>}>
      <OrderReceipt />
    </Suspense>
  );
}

function OrderReceipt() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") ?? "";
  const receiptUnavailable = searchParams.get("receipt") === "unavailable";
  const receiptText = useSyncExternalStore(subscribeToReceipt, getStoredReceipt, () => "");
  let receipt: OrderReceipt | undefined;
  let receiptError = "";
  if (receiptUnavailable && !orderNumber) {
    receiptError = "Your order was accepted, but this browser did not return receipt details. Please contact the store with the checkout name and phone number.";
  } else if (!receiptText) {
    receiptError = "The totals could not be loaded in this browser. Use order lookup with your order number and contact details.";
  } else {
    try {
      const parsed = orderReceiptSchema.safeParse(JSON.parse(receiptText));
      if (parsed.success && parsed.data.id === orderNumber) receipt = parsed.data;
      else receiptError = "The receipt could not be validated. Use order lookup with your order number and contact details.";
    } catch {
      receiptError = "The receipt could not be read in this browser. Use order lookup with your order number and contact details.";
    }
  }

  return (
    <section className="mx-auto grid min-h-[55vh] max-w-[560px] justify-items-center gap-4 px-6 py-[100px] text-center max-[700px]:min-h-[48vh] max-[700px]:py-[72px]">
      <span className="grid h-12 w-12 place-items-center rounded-full border border-green text-green">
        <Check size={24} />
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[1.6px]">Order received</span>
      <h1>Thank you.</h1>
      <p className="max-w-[430px] text-muted">Your order is pending review. We will contact you to confirm availability and delivery details.</p>
      {receipt && (
        <div className="my-3 grid w-full gap-3 border-y border-line py-4 text-left text-sm">
          <p>
            Order number: <strong className="break-all">{receipt.id}</strong>
          </p>
          <div className="flex justify-between gap-4">
            <span>Item subtotal</span>
            <strong>{money(receipt.subtotal)}</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span>Delivery charge</span>
            <strong>{money(receipt.deliveryCharge)}</strong>
          </div>
          <div className="flex justify-between gap-4 border-t border-line pt-3">
            <span>Grand total</span>
            <strong>{money(receipt.total)}</strong>
          </div>
        </div>
      )}
      {!receipt && receiptError && (
        <div className="w-full rounded-[4px] border border-[#e4bfb4] bg-[#fff1ec] p-3 text-left text-xs text-[#873723]">
          <p role="status">{receiptError}</p>
          {orderNumber && <p className="mt-2 break-all">Order number: {orderNumber}</p>}
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        {orderNumber && (
          <Button asChild variant="outline">
            <Link href="/order-history">Look up this order</Link>
          </Button>
        )}
        <Button asChild>
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    </section>
  );
}
