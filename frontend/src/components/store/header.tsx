import Link from "next/link";
import { ArrowUpRight, Search, UserRound } from "lucide-react";
import { storeName } from "@/lib/site";
import { CartIndicator } from "./cart-indicator";

export function Header() {
  return (
    <>
      <header className="header-motion sticky top-0 z-20 border-b border-white/70 bg-glass-surface shadow-[0_12px_36px_rgba(31,53,39,0.08)] backdrop-blur-[24px] backdrop-saturate-[145%]">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-[25px] px-[5%] py-[17px] max-[700px]:gap-[10px]">
          <Link href="/" className="inline-flex items-center gap-[5px] font-editorial text-[32px] font-bold leading-none max-[700px]:text-[29px]" aria-label={`${storeName} home`}>
            {storeName}
            <span className="mb-1 h-[5px] w-[5px] self-end bg-coral" />
          </Link>
          <nav className="flex items-center gap-[34px] text-xs whitespace-nowrap max-[700px]:gap-3 max-[700px]:text-[11px]" aria-label="Main navigation">
            <Link className="header-link-motion hover:text-green" href="/products">
              The collection
            </Link>
            <Link className="flex gap-1 items-center header-link-motion max-[700px]:hidden hover:text-green" href="/products?sort=newest">
              New arrivals <ArrowUpRight size={14} />
            </Link>
          </nav>
          <div className="flex items-center gap-[14px] max-[700px]:gap-0.5">
            <CartIndicator />
            <Link href="/products#catalogue-search" className="icon-link-motion grid h-[34px] w-[34px] place-items-center rounded-full border border-transparent hover:border-[#ffffffd9] hover:bg-[#ffffffa8]" aria-label="Search products" title="Search products">
              <Search size={20} />
            </Link>
            <Link href="/admin" className="icon-link-motion grid h-[34px] w-[34px] place-items-center rounded-full border border-transparent hover:border-[#ffffffd9] hover:bg-[#ffffffa8]" aria-label="Admin dashboard" title="Admin dashboard">
              <UserRound size={20} />
            </Link>
          </div>
        </div>
      </header>
    </>
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
