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
    <form className="catalogue-toolbar" action="/products" onSubmit={handleSubmit}>
      <Label className="search-field">
        <Search size={18} />
        <Input id="catalogue-search" name="q" type="search" className="catalogue-search-input focus:shadow-none!" defaultValue={params.q || ""} placeholder="Find your next everyday piece" aria-label="Search products" />
      </Label>
      {params.category && <input type="hidden" name="category" value={params.category} />}
      <div className="catalogue-sort">
        <span>Sort by</span>
        <Select name="sort" defaultValue={params.sort || "newest"}>
          <SelectTrigger className="catalogue-sort-trigger" aria-label="Sort products">
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
      <Button type="submit" variant="outline" size="icon" title="Apply search and sort" aria-label="Apply search and sort">
        <ArrowRight size={18} />
      </Button>
    </form>
  );
}
