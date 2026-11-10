"use client";
import Link from "next/link";
import { useState } from "react";
import { Plus, Search, Pencil, Trash2, ArrowLeft, ArrowRight } from "lucide-react";
import { useProductsQuery, useChangeMutation } from "@/store/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Confirm } from "@/components/ui/confirm";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { money } from "@/lib/utils";

export default function Products() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { data, isFetching, error, refetch } = useProductsQuery(
    new URLSearchParams({
      q: query,
      page: String(page),
      pageSize: "15",
      ...(status ? { status } : {}),
    }).toString(),
  );
  const [change] = useChangeMutation();
  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-5 max-[700px]:mb-6 max-[700px]:items-start max-[700px]:gap-3">
        <div>
          <span className="text-[9px] uppercase tracking-[1.6px] text-muted">Catalogue</span>
          <h1 className="mt-2 overflow-wrap-anywhere font-sans text-[28px] font-medium leading-[1.2] max-[700px]:text-[25px]">Products</h1>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus size={16} /> Add product
          </Link>
        </Button>
      </div>
      <form
        className="mb-6 grid grid-cols-[minmax(0,1fr)_160px_auto] gap-3 max-[700px]:grid-cols-[minmax(0,1fr)_105px_auto] max-[700px]:gap-[7px]"
        onSubmit={(event) => {
          event.preventDefault();
          const values = new FormData(event.currentTarget);
          setQuery(String(values.get("q") || ""));
          const selectedStatus = String(values.get("status") || "");
          setStatus(selectedStatus === "all" ? "" : selectedStatus);
          setPage(1);
        }}
      >
        <Label className="flex h-[42px] min-w-0 items-center gap-[11px] rounded-[4px] border border-line bg-white/80 px-3 text-muted focus-within:border-[#547961] focus-within:bg-white">
          <Search size={17} />
          <Input className="border-0 bg-transparent px-0 py-0 shadow-none" name="q" placeholder="Search name or SKU" aria-label="Search products" />
        </Label>
        <Select name="status" defaultValue="all">
          <SelectTrigger aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="DRAFT">DRAFT</SelectItem>
            <SelectItem value="PUBLISHED">PUBLISHED</SelectItem>
            <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" type="submit">
          Filter
        </Button>
      </form>
      {error && (
        <div className="rounded-[4px] border border-[#e4bfb4] bg-[#fff1ec] p-3 text-xs text-[#873723]">
          Unable to load products.{" "}
          <Button variant="ghost" onClick={refetch}>
            Retry
          </Button>
        </div>
      )}
      <TableContainer aria-busy={isFetching}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price (BDT)</TableHead>
              <TableHead>Variants</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="min-w-[180px]">
                  <Link href={`/admin/products/${product.id}`}>
                    <strong>{product.name}</strong>
                  </Link>
                  {product.featured && <span className="mt-[5px] block text-[9px] text-coral">Featured</span>}
                </TableCell>
                <TableCell>{product.category.name}</TableCell>
                <TableCell>{money(product.fromPrice)}</TableCell>
                <TableCell>{product.variants.length}</TableCell>
                <TableCell>
                  <StatusBadge tone={product.status === "PUBLISHED" ? "positive" : product.status === "DRAFT" ? "warning" : "muted"}>{product.status}</StatusBadge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-[3px] whitespace-nowrap">
                    <Button className="!h-8 !min-h-8 !w-8" asChild variant="ghost" size="icon">
                      <Link href={`/admin/products/${product.id}`} aria-label={`Edit ${product.name}`} title="Edit product">
                        <Pencil size={15} />
                      </Link>
                    </Button>
                    <Confirm
                      title="Delete product?"
                      description={`Permanently remove ${product.name}, its variants and images. Archiving keeps the product for later.`}
                      onConfirm={() =>
                        change({
                          url: `/admin/products/${product.id}`,
                          method: "DELETE",
                        }).unwrap()
                      }
                      trigger={
                        <Button className="!h-8 !min-h-8 !w-8" variant="ghost" size="icon" aria-label={`Delete ${product.name}`} title="Delete product">
                          <Trash2 size={15} />
                        </Button>
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {data?.total === 0 && <div className="min-h-[250px] px-5 py-20 text-center">No products match your filters.</div>}
      <div className="mt-[35px] flex items-center justify-between border-t border-line pt-5 text-xs max-[700px]:text-[11px]">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          <ArrowLeft size={14} /> Previous
        </Button>
        <span>
          Page {page} / {Math.max(data?.totalPages || 1, 1)}
        </span>
        <Button variant="outline" size="sm" disabled={!data || page >= data.totalPages} onClick={() => setPage(page + 1)}>
          Next <ArrowRight size={14} />
        </Button>
      </div>
    </>
  );
}
