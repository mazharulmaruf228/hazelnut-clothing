"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";

export function CartIndicator() {
  const { count } = useCart();
  return (
    <Link href="/cart" className="icon-link cart-indicator" aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`} title="Shopping cart">
      <ShoppingBag size={20} />
      <span aria-hidden="true">{count}</span>
    </Link>
  );
}
