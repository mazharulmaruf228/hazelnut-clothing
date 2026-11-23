"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { removePurchasedQuantities } from "@/lib/cart";
import { readGuestPaymentAccess, readGuestPaymentAccesses, readPaymentCheckout, readPaymentCheckoutByKey, readPaymentCheckouts, savePaymentCheckout } from "@/lib/payment-checkout";
import { orderReceiptSchema } from "@/schemas/api";

const paymentStatusSchema = orderReceiptSchema.extend({
  paymentStatus: z.enum(["INITIATING", "PENDING", "PAID", "RISK_REVIEW", "EXPIRED", "REFUND_REQUIRED", "REFUNDED"]),
  gatewayUrl: z.url().nullable(),
});

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<section className="mx-auto min-h-[55vh] max-w-140 px-6 py-25" />}>
      <PaymentReturn />
    </Suspense>
  );
}

function PaymentReturn() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order") ?? "";
  const [payment, setPayment] = useState<z.infer<typeof paymentStatusSchema> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function check() {
      let checkout = readPaymentCheckout(orderId || undefined);
      let result: z.infer<typeof paymentStatusSchema> | null = null;
      if (orderId && !checkout) {
        for (const candidate of readPaymentCheckouts()
          .filter((item) => !item.orderId && !item.settled)
          .slice(0, 10)) {
          try {
            const response = await fetch("/api/orders/payment-status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: candidate.key }) });
            if (!response.ok) continue;
            const found = paymentStatusSchema.parse(await response.json());
            if (found.id === orderId) {
              checkout = { ...candidate, orderId, draft: false };
              savePaymentCheckout(checkout);
              result = found;
              break;
            }
          } catch {}
        }
      }
      const savedAccess = readGuestPaymentAccesses();
      const access = orderId ? readGuestPaymentAccess(orderId) : !readPaymentCheckouts().length && savedAccess.length === 1 ? savedAccess[0] : null;
      if (!orderId && checkout && savedAccess.some((item) => item.orderId !== checkout!.orderId)) checkout = null;
      if (!checkout && !access) {
        if (active) setError("Payment details are unavailable in this browser. Use order lookup or contact the store.");
        return;
      }
      try {
        if (!result) {
          const response = await fetch(checkout ? "/api/orders/payment-status" : "/api/orders/guest-payment-status", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(checkout ? { key: checkout.key } : { orderId: access!.orderId, statusToken: access!.statusToken }),
          });
          if (!response.ok) throw new Error("Payment status is unavailable. Please try again later.");
          result = paymentStatusSchema.parse(await response.json());
        }
        if ((orderId && result.id !== orderId) || (access && !checkout && result.id !== access.orderId)) throw new Error("Invalid payment status.");
        if (!active) return;
        const current = checkout ? readPaymentCheckoutByKey(checkout.key) : null;
        if (checkout && !current) return;
        if (current && !current.settled && ["PAID", "RISK_REVIEW"].includes(result.paymentStatus)) {
          savePaymentCheckout({ ...current, orderId: result.id, draft: false, settled: true });
          await removePurchasedQuantities(current.items);
          sessionStorage.setItem("latest-order-receipt", JSON.stringify(result));
        } else if (current && !current.settled && ["EXPIRED", "REFUND_REQUIRED", "REFUNDED"].includes(result.paymentStatus)) {
          savePaymentCheckout({ ...current, orderId: result.id, draft: false, settled: true });
        }
        setPayment(result);
        setError("");
      } catch {
        if (active) setError("Payment status is unavailable. Please try again later.");
      }
    }
    void check();
    const timer = window.setInterval(() => void check(), 10_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [orderId]);

  const message =
    payment?.paymentStatus === "PAID"
      ? "Payment verified. Your order is pending review."
      : payment?.paymentStatus === "RISK_REVIEW"
        ? "Payment received and awaiting review."
        : payment?.paymentStatus === "EXPIRED"
          ? "The reservation expired. A late payment may still require a refund."
          : payment?.paymentStatus === "REFUND_REQUIRED"
            ? "Payment was received after the order could be fulfilled. A refund requires review."
            : payment?.paymentStatus === "REFUNDED"
              ? "The refund has been recorded."
              : "Payment confirmation is pending.";
  let gatewayUrl = "";
  if (payment?.gatewayUrl) {
    const url = new URL(payment.gatewayUrl);
    if (url.origin === "https://sandbox.sslcommerz.com") gatewayUrl = url.href;
  }
  return (
    <section className="mx-auto grid min-h-[55vh] max-w-140 justify-items-center gap-4 px-6 py-25 text-center">
      <h1>Sandbox payment</h1>
      <p role="status" className="text-muted">
        {error || message}
      </p>
      {payment && (
        <p className="break-all text-sm">
          Order number: <strong>{payment.id}</strong>
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        {gatewayUrl && (
          <Button asChild>
            <a href={gatewayUrl}>Continue sandbox payment</a>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href="/order-history">Look up an order</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/cart">Return to bag</Link>
        </Button>
      </div>
    </section>
  );
}
