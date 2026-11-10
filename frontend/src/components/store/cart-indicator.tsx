"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";

export function CartIndicator() {
  const { count } = useCart();
  return (
    <Link href="/cart" className="icon-link-motion relative grid h-[34px] w-[34px] place-items-center rounded-full border border-transparent hover:border-[#ffffffd9] hover:bg-[#ffffffa8]" aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`} title="Shopping cart">
      <ShoppingBag size={20} />
      <span className="absolute -top-[5px] -right-[7px] grid h-[17px] min-w-[17px] place-items-center rounded-full bg-coral px-1 text-[9px] leading-none text-white" aria-hidden="true">
        {count}
      </span>
    </Link>
  );
}
