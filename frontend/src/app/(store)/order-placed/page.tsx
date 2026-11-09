import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OrderPlacedPage() {
  return (
    <section className="order-placed">
      <span className="order-placed-mark">
        <Check size={24} />
      </span>
      <span className="eyebrow">Order received</span>
      <h1>Thank you.</h1>
      <p>Your order is pending review. We will contact you to confirm availability and delivery details.</p>
      <Button asChild>
        <Link href="/products">Continue shopping</Link>
      </Button>
    </section>
  );
}
