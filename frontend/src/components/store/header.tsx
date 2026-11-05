import Link from "next/link";
import { ArrowUpRight, Search, UserRound } from "lucide-react";
import { storeName } from "@/lib/site";

export function Header() {
  return (
    <>
      <div className="announcement">
        A considered wardrobe. An everyday point of view.
        <span>Prices in BDT</span>
      </div>
      <header className="site-header glass">
        <div className="header-inner">
          <Link href="/" className="wordmark" aria-label={`${storeName} home`}>
            {storeName}
            <span className="brand-mark" />
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/products">The collection</Link>
            <Link href="/products?sort=newest">
              New arrivals <ArrowUpRight size={14} />
            </Link>
          </nav>
          <div className="header-tools">
            <Link href="/products#catalogue-search" className="icon-link" aria-label="Search products" title="Search products">
              <Search size={20} />
            </Link>
            <Link href="/admin" className="icon-link" aria-label="Admin dashboard" title="Admin dashboard">
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
    <footer className="site-footer">
      <div>
        <Link href="/" className="wordmark">
          {storeName}
        </Link>
        <p>Everyday pieces. Individual expression.</p>
      </div>
      <div>
        <Link href="/products">
          Explore the collection <ArrowUpRight size={15} />
        </Link>
        <span>BDT / Bangladesh</span>
        <Link href="/admin">Catalogue management</Link>
      </div>
    </footer>
  );
}
