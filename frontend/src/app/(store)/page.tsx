import Image from "next/image";
import Link from "next/link";
import { storeName } from "@/lib/site";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Catalogue, type CatalogueParams } from "@/components/store/catalogue";

export const dynamic = "force-dynamic";
export default async function Home({ searchParams }: { searchParams: Promise<CatalogueParams> }) {
  return (
    <>
      <section className="relative isolate h-[calc(100svh-69px)] overflow-hidden">
        <Image className="hero-drift-motion object-[center_55%]" src="https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=2000&q=85" alt="A curated rail of everyday clothing" fill sizes="100vw" loading="eager" fetchPriority="high" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(23,39,30,0.62)_0%,rgba(23,39,30,0.36)_43%,rgba(23,39,30,0.04)_100%)]" />
        <div className="relative z-[1] mx-auto flex h-full max-w-[1350px] flex-col items-start justify-center px-[5%] py-[55px] text-white max-[700px]:px-[5%] max-[700px]:py-7">
          <span className="hero-content-motion text-[10px] font-semibold uppercase tracking-[1.6px] text-[#f0e5c7]">The everyday collection</span>
          <h1 className="hero-content-motion my-3 mb-1 text-[96px] leading-[0.92] max-[700px]:text-[64px]">{storeName}</h1>
          <p className="hero-content-motion text-[17px] text-[#f4f5ef] max-[700px]:text-sm">Good pieces. Your own way.</p>
          <a className="hero-content-motion hero-link-motion mt-[29px] inline-flex items-center gap-[22px] rounded-[4px] border border-white/50 bg-white/10 px-[15px] py-[11px] text-[13px] backdrop-blur-[12px] hover:bg-white/25" href="#collection">
            Discover the collection <ArrowDownRight size={20} />
          </a>
        </div>
        <span className="absolute right-[5%] bottom-[30px] z-[1] rounded-[4px] border border-white/45 bg-white/15 px-[17px] py-3 font-editorial text-[21px] text-white shadow-[0_12px_32px_rgba(18,30,23,0.12)] backdrop-blur-[18px] backdrop-saturate-[140%] max-[700px]:hidden">
          A wardrobe, considered.
        </span>
      </section>
      <Catalogue params={{ ...(await searchParams), featured: "true" }} featuredCarousel />
      <section className="story-scroll-motion bg-[linear-gradient(115deg,#eaf0e9_0%,#f5f6f1_56%,#edf2ed_100%)] px-[5%] pt-[82px] pb-[96px] max-[700px]:pt-12 max-[700px]:pb-[58px]" aria-labelledby="story-title">
        <div className="mx-auto grid max-w-[1340px] grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] items-center gap-[8%] max-[700px]:grid-cols-1 max-[700px]:gap-[25px]">
          <div className="relative isolate aspect-[5/4] min-w-0 overflow-hidden rounded-md bg-[#e2e8e1] shadow-[0_20px_50px_rgba(32,54,39,0.12)] max-[700px]:aspect-[4/3]">
            <Image className="story-photo-motion" src="https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=1400&q=85" alt="Carefully arranged everyday clothing in a wardrobe" fill sizes="(max-width: 700px) 90vw, 52vw" loading="lazy" />
            <div className="story-fold-panels" aria-hidden="true">
              <span className="story-fold-panel story-fold-left" />
              <span className="story-fold-panel story-fold-right" />
            </div>
            <span className="absolute right-[18px] bottom-[18px] z-[2] rounded-[4px] border border-glass-border bg-glass-surface px-[14px] py-[10px] font-editorial text-[19px] text-[#263d32] shadow-[0_12px_32px_rgba(18,30,23,0.12)] backdrop-blur-[24px] backdrop-saturate-[145%] max-[700px]:right-3 max-[700px]:bottom-3 max-[700px]:px-[11px] max-[700px]:py-2 max-[700px]:text-base">
              A wardrobe, considered.
            </span>
          </div>
          <div className="story-copy-motion max-w-[460px] py-7 max-[700px]:max-w-none max-[700px]:py-0">
            <span className="text-[10px] font-semibold uppercase tracking-[1.6px] text-green">A thoughtful wardrobe</span>
            <h2 className="mt-3 text-[48px] max-[700px]:mt-2 max-[700px]:text-4xl" id="story-title">
              Our story
            </h2>
            <p className="mt-5 text-sm leading-[1.8] text-[#566259] max-[700px]:mt-[13px] max-[700px]:text-[13px]">Everyday clothing should feel considered without feeling complicated. Hazelnut brings together easy-to-wear pieces, thoughtful details, and room to make each look your own.</p>
            <Link href="/products" className="story-link-motion mt-[27px] inline-flex items-center gap-4 border-b border-[#20372a]/65 py-2.5 text-xs font-semibold text-[#20372a] max-[700px]:mt-[18px]">
              Explore the collection <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
