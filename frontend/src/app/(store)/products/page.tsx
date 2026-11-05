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
      <div className="page-intro">
        <span className="eyebrow">Everyday, with intention.</span>
        <h1>Clothing</h1>
      </div>
      <Catalogue params={await searchParams} />
    </>
  );
}
