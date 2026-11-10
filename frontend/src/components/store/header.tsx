"use client";

import Link from "next/link";
import { ArrowUpRight, Search, UserRound } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { storeName } from "@/lib/site";
import { CartIndicator } from "./cart-indicator";

export function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isProductsPage = pathname === "/products";
  const isNewArrivals = isProductsPage && searchParams.get("sort") === "newest";
  const isCollection = isProductsPage && !isNewArrivals;
  const activeLinkClass =
    "rounded-full bg-[#f7f5eb] px-4 py-2 font-semibold text-[#203b2e] shadow-sm hover:bg-white max-[700px]:px-2.5";
  const inactiveLinkClass =
    "rounded-full px-4 py-2 text-white/70 hover:bg-white/10 hover:text-white max-[700px]:px-2.5";

  return (
    <header className="header-motion sticky top-0 z-20 border-b border-white/10 bg-[#203b2e] text-[#f7f5eb] shadow-[0_10px_30px_rgba(24,44,33,0.14)]">
      <div className="mx-auto grid min-h-[68px] max-w-[1500px] grid-cols-[1fr_auto_1fr] items-center gap-5 px-[5%] max-[700px]:grid-cols-[auto_1fr_auto] max-[700px]:gap-2 max-[700px]:px-[4%]">
        <Link href="/" className="inline-flex w-fit items-center gap-2 font-editorial text-[34px] font-bold leading-none text-[#f7f5eb] max-[700px]:text-[28px]" aria-label={`${storeName} home`}>
          {storeName}
          <span className="mb-1 h-[6px] w-[6px] rounded-full bg-[#d78b68]" />
        </Link>
        <nav className="flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.07] p-1 text-[11px] whitespace-nowrap max-[700px]:justify-self-center max-[700px]:text-[10px]" aria-label="Main navigation">
          <Link
            className={`header-link-motion ${isCollection ? activeLinkClass : inactiveLinkClass}`}
            href="/products"
            aria-current={isCollection ? "page" : undefined}
          >
            The collection
          </Link>
          <Link
            className={`header-link-motion flex items-center gap-1 max-[700px]:hidden ${isNewArrivals ? activeLinkClass : inactiveLinkClass}`}
            href="/products?sort=newest"
            aria-current={isNewArrivals ? "page" : undefined}
          >
            New arrivals <ArrowUpRight size={13} />
          </Link>
        </nav>
        <div className="flex items-center justify-self-end gap-2 max-[700px]:gap-0.5">
          <CartIndicator />
          <Link
            href="/products#catalogue-search"
            className="icon-link-motion grid h-[36px] w-[36px] place-items-center rounded-full border border-white/20 text-[#f7f5eb] hover:border-white/50 hover:bg-white/10 max-[700px]:h-[32px] max-[700px]:w-[32px]"
            aria-label="Search products"
            title="Search products"
          >
            <Search size={18} />
          </Link>
          <Link href="/admin" className="icon-link-motion grid h-[36px] w-[36px] place-items-center rounded-full border border-white/20 text-[#f7f5eb] hover:border-white/50 hover:bg-white/10 max-[700px]:h-[32px] max-[700px]:w-[32px]" aria-label="Admin dashboard" title="Admin dashboard">
            <UserRound size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function HeaderFallback() {
  const inactiveLinkClass =
    "rounded-full px-4 py-2 text-white/70 max-[700px]:px-2.5";

  return (
    <header className="sticky top-0 z-20 min-h-[68px] border-b border-white/10 bg-[#203b2e] text-[#f7f5eb] shadow-[0_10px_30px_rgba(24,44,33,0.14)]">
      <div className="mx-auto grid min-h-[68px] max-w-[1500px] grid-cols-[1fr_auto_1fr] items-center gap-5 px-[5%] max-[700px]:grid-cols-[auto_1fr_auto] max-[700px]:gap-2 max-[700px]:px-[4%]">
        <Link href="/" className="inline-flex w-fit items-center gap-2 font-editorial text-[34px] font-bold leading-none text-[#f7f5eb] max-[700px]:text-[28px]" aria-label={`${storeName} home`}>
          {storeName}
          <span className="mb-1 h-[6px] w-[6px] rounded-full bg-[#d78b68]" />
        </Link>
        <nav className="flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.07] p-1 text-[11px] whitespace-nowrap max-[700px]:justify-self-center max-[700px]:text-[10px]" aria-label="Main navigation">
          <span className={inactiveLinkClass}>The collection</span>
          <span className={`${inactiveLinkClass} max-[700px]:hidden`}>New arrivals</span>
        </nav>
        <div className="flex items-center justify-self-end gap-2 max-[700px]:gap-0.5">
          <CartIndicator />
          <span className="grid h-[36px] w-[36px] place-items-center rounded-full border border-white/20 max-[700px]:h-[32px] max-[700px]:w-[32px]" aria-hidden="true">
            <Search size={18} />
          </span>
          <span className="grid h-[36px] w-[36px] place-items-center rounded-full border border-white/20 max-[700px]:h-[32px] max-[700px]:w-[32px]" aria-hidden="true">
            <UserRound size={18} />
          </span>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="flex items-end justify-between gap-[30px] border-t border-line bg-[#edf0eb] px-[5%] py-10 max-[700px]:flex-col max-[700px]:items-start max-[700px]:gap-[25px] max-[700px]:py-[30px]">
      <div>
        <Link href="/" className="inline-flex items-center gap-[5px] font-editorial text-[32px] font-bold leading-none">
          {storeName}
          <span className="mb-1 h-[5px] w-[5px] self-end bg-coral" />
        </Link>
        <p className="mt-3 text-xs text-muted">Copyright &copy; 2026</p>
      </div>
      <div className="flex flex-col gap-2 text-[11px]">
        <Link className="flex items-center gap-[5px] hover:text-green" href="/products">
          Explore the collection <ArrowUpRight size={15} />
        </Link>
        <Link className="hover:text-green" href="/order-history">
          Order lookup
        </Link>
        <Link className="hover:text-green" href="/admin">
          Catalogue management
        </Link>
      </div>
    </footer>
  );
}
