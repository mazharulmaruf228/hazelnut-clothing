"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CatalogueToolbarParams = {
  q?: string;
  category?: string;
  sort?: string;
};

export function CatalogueToolbar({ params }: { params: CatalogueToolbarParams }) {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = new URLSearchParams();
    for (const name of ["q", "category", "sort"] as const) {
      const value = formData.get(name);
      if (typeof value === "string") query.set(name, value);
    }
    router.push(`/products?${query.toString()}`);
  }

  return (
    <form
      className="mb-[25px] grid grid-cols-[minmax(0,1fr)_minmax(132px,172px)_46px] items-center gap-2 rounded-[7px] border border-[#ffffffd1] bg-[rgba(255,255,255,0.66)] p-[7px] shadow-[0_12px_30px_rgba(34,54,41,0.07)] backdrop-blur-[18px] backdrop-saturate-[135%] max-[700px]:grid-cols-[minmax(0,1fr)_minmax(108px,124px)_42px] max-[700px]:gap-[6px] max-[700px]:p-[6px]"
      action="/products"
      onSubmit={handleSubmit}
    >
      <Label className="search-field-motion flex h-[46px] min-w-0 items-center gap-[11px] rounded-[5px] border border-[rgba(220,225,220,0.8)] bg-[rgba(255,255,255,0.64)] px-[13px] font-normal text-muted focus-within:border-[rgba(54,94,74,0.56)] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(54,94,74,0.12)]">
        <Search size={18} />
        <Input
          id="catalogue-search"
          name="q"
          type="search"
          className="!h-full !min-w-0 !border-0 !rounded-none !bg-transparent !px-0 !py-0 text-xs !shadow-none placeholder:text-[#78827b] focus-visible:!border-0 focus-visible:!shadow-none focus-visible:!outline-none"
          defaultValue={params.q || ""}
          placeholder="Find your next everyday piece"
          aria-label="Search products"
        />
      </Label>
      {params.category && <input type="hidden" name="category" value={params.category} />}
      <div className="catalogue-sort-motion flex h-[46px] min-w-0 flex-col items-stretch justify-center gap-0.5 rounded-[5px] border border-[rgba(220,225,220,0.8)] bg-[rgba(255,255,255,0.64)] px-[10px] py-1 focus-within:border-[rgba(54,94,74,0.56)] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(54,94,74,0.12)]">
        <span className="text-[8px] font-[650] uppercase leading-none text-muted">Sort by</span>
        <Select name="sort" defaultValue={params.sort || "newest"}>
          <SelectTrigger
            className="!h-[21px] !min-h-[21px] !w-[calc(100%+20px)] !min-w-0 !-mx-[10px] !rounded-none !border-0 !bg-transparent !px-[10px] !py-0 text-[11px] !font-semibold !shadow-none focus-visible:!outline-none focus-visible:!shadow-none data-[state=open]:!shadow-none"
            aria-label="Sort products"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="name">Name: A to Z</SelectItem>
            <SelectItem value="price-asc">Price: low to high</SelectItem>
            <SelectItem value="price-desc">Price: high to low</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        type="submit"
        variant="outline"
        size="icon"
        className="toolbar-button-motion !h-[46px] !min-h-[46px] !w-[46px] !rounded-[5px] !border-green !bg-green !px-0 !py-0 text-white hover:!bg-[#294d3a] hover:!brightness-100 hover:!shadow-[0_5px_12px_rgba(41,77,58,0.2)] focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-coral focus-visible:!outline-offset-2 max-[700px]:!w-[42px]"
        title="Apply search and sort"
        aria-label="Apply search and sort"
      >
        <ArrowRight size={18} />
      </Button>
    </form>
  );
}
