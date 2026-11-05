import Image from "next/image";
import { storeName } from "@/lib/site";
import { ArrowDownRight } from "lucide-react";
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
      <Catalogue params={{ ...(await searchParams), featured: "true" }} />
    </>
  );
}
