"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { orderReceiptSchema, type OrderReceipt } from "@/schemas/api";
import { money } from "@/lib/utils";
import { completePaidCart, finalizePaymentAttempt, storedPaymentAttempt } from "@/lib/payment";

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
  if (searchParams.get("payment") === "stripe") return <StripeReceipt key={orderNumber} orderNumber={orderNumber} />;
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

function StripeReceipt({ orderNumber }: { orderNumber: string }) {
  const [receipt, setReceipt] = useState<OrderReceipt>();
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    async function refresh() {
      try {
        const attempt = storedPaymentAttempt();
        if (attempt?.orderId !== orderNumber) throw new Error("Use order lookup with your order number and contact details to check payment.");
        const response = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}/payment`, { headers: { authorization: `Bearer ${attempt.key}` }, signal: controller.signal });
        if (!response.ok) throw new Error("Payment status could not be verified. Use order lookup to check this order.");
        const current = orderReceiptSchema.parse(await response.json());
        if (current.id !== orderNumber || current.paymentMethod !== "STRIPE") throw new Error("Payment receipt did not match this order.");
        if (controller.signal.aborted) return;
        setReceipt(current);
        if (current.status === "CONFIRMED" && current.paymentStatus === "PAID") {
          try {
            await completePaidCart(orderNumber);
          } catch {}
        } else if (current.status === "PAYMENT_EXPIRED" || current.status === "CANCELLED") {
          try {
            finalizePaymentAttempt(orderNumber);
          } catch {}
        } else if (current.status === "PENDING_PAYMENT" && ++attempts < 20) {
          timer = setTimeout(() => void refresh(), 1500);
        }
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Unable to verify payment.");
      }
    }
    void refresh();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [orderNumber]);
  const paid = receipt?.status === "CONFIRMED" && receipt.paymentStatus === "PAID";
  const pending = !receipt || receipt.status === "PENDING_PAYMENT";
  return (
    <section className="mx-auto grid min-h-[55vh] max-w-[560px] justify-items-center gap-4 px-6 py-[100px] text-center max-[700px]:py-[72px]">
      {paid && (
        <span className="grid h-12 w-12 place-items-center rounded-full border border-green text-green">
          <Check size={24} />
        </span>
      )}
      <span className="text-[10px] font-semibold uppercase">Stripe test payment</span>
      <h1 className="text-3xl">{paid ? "Thank you." : error ? "Payment status unavailable" : pending ? "Payment pending" : receipt.status === "PAYMENT_EXPIRED" ? "Checkout expired" : receipt.status === "CANCELLED" ? "Order cancelled" : "Payment status"}</h1>
      <p role="status" className="text-sm text-muted">
        {error ||
          (paid
            ? "Payment received. Your order is confirmed."
            : pending
              ? "Payment has not been confirmed yet. Check this order before paying again."
              : receipt.paymentStatus === "REFUNDED"
                ? "Your payment has been refunded."
                : receipt.status === "PAYMENT_EXPIRED"
                  ? "No payment was confirmed. Your bag has not been cleared."
                  : "Your payment status is shown below.")}
      </p>
      <p className="max-w-full break-all text-sm">
        Order number: <strong>{orderNumber}</strong>
      </p>
      {receipt && (
        <div className="grid w-full gap-3 border-y border-line py-4 text-left text-sm">
          <div className="flex justify-between gap-4">
            <span>Payment</span>
            <strong>{receipt.paymentStatus.replaceAll("_", " ")}</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span>Item subtotal</span>
            <strong>{money(receipt.subtotal)}</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span>Delivery charge</span>
            <strong>{money(receipt.deliveryCharge)}</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span>Grand total</span>
            <strong>{money(receipt.total)}</strong>
          </div>
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild variant="outline">
          <Link href="/order-history">Look up this order</Link>
        </Button>
        <Button asChild>
          <Link href={paid ? "/products" : "/cart"}>{paid ? "Continue shopping" : "Back to your bag"}</Link>
        </Button>
      </div>
    </section>
  );
}
