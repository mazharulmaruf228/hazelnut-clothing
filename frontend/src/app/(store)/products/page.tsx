import type { Metadata } from "next";
import { Catalogue, type CatalogueParams } from "@/components/store/catalogue";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "The collection",
  alternates: { canonical: "/products" },
};
export default async function Products({ searchParams }: { searchParams: Promise<CatalogueParams> }) {
  return (
    <>
      <div className="mx-auto max-w-[1500px] px-[5%] pt-[35px] max-[700px]:pt-[25px]">
        <span className="text-[10px] font-semibold uppercase tracking-[1.6px]">Everyday, with intention.</span>
        <h1 className="mt-2">Clothing</h1>
      </div>
      <Catalogue params={await searchParams} />
    </>
  );
}
