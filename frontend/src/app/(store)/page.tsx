import Image from "next/image";
import Link from "next/link";
import { storeName } from "@/lib/site";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Catalogue, type CatalogueParams } from "@/components/store/catalogue";

export const dynamic = "force-dynamic";
export default async function Home({ searchParams }: { searchParams: Promise<CatalogueParams> }) {
  return (
    <>
      <section className="collection-banner">
        <Image src="https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=2000&q=85" alt="A curated rail of everyday clothing" fill sizes="100vw" loading="eager" fetchPriority="high" />
        <div className="banner-scrim" />
        <div className="banner-content">
          <span className="eyebrow">The everyday collection</span>
          <h1>{storeName}</h1>
          <p>Good pieces. Your own way.</p>
          <a href="#collection">
            Discover the collection <ArrowDownRight size={20} />
          </a>
        </div>
        <span className="banner-edition">A wardrobe, considered.</span>
      </section>
      <Catalogue params={{ ...(await searchParams), featured: "true" }} featuredCarousel />
      <section className="story-section" aria-labelledby="story-title">
        <div className="story-inner">
          <div className="story-image">
            <Image src="https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=1400&q=85" alt="Carefully arranged everyday clothing in a wardrobe" fill sizes="(max-width: 700px) 90vw, 52vw" loading="lazy" />
            <div className="story-fold-panels" aria-hidden="true">
              <span className="story-fold-panel story-fold-left" />
              <span className="story-fold-panel story-fold-right" />
            </div>
            <span className="story-image-note glass">A wardrobe, considered.</span>
          </div>
          <div className="story-copy">
            <span className="eyebrow">A thoughtful wardrobe</span>
            <h2 id="story-title">Our story</h2>
            <p>Everyday clothing should feel considered without feeling complicated. Hazelnut brings together easy-to-wear pieces, thoughtful details, and room to make each look your own.</p>
            <Link href="/products" className="story-link">
              Explore the collection <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
