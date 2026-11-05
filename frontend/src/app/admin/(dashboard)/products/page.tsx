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
      <div className="admin-title">
        <div>
          <span className="eyebrow">Catalogue</span>
          <h1>Products</h1>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus size={16} /> Add product
          </Link>
        </Button>
      </div>
      <form
        className="admin-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          const values = new FormData(event.currentTarget);
          setQuery(String(values.get("q") || ""));
          const selectedStatus = String(values.get("status") || "");
          setStatus(selectedStatus === "all" ? "" : selectedStatus);
          setPage(1);
        }}
      >
          <Label className="search-field">
          <Search size={17} />
            <Input name="q" placeholder="Search name or SKU" aria-label="Search products" />
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
        <div className="status-message">
          Unable to load products. <Button variant="ghost" onClick={refetch}>Retry</Button>
        </div>
      )}
      <div className="table-scroll" aria-busy={isFetching}>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price (BDT)</th>
              <th>Variants</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((product) => (
              <tr key={product.id}>
                <td>
                  <Link href={`/admin/products/${product.id}`}>
                    <strong>{product.name}</strong>
                  </Link>
                  {product.featured && <span className="featured-label">Featured</span>}
                </td>
                <td>{product.category.name}</td>
                <td>{money(product.fromPrice)}</td>
                <td>{product.variants.length}</td>
                <td>
                  <span className={`status-tag ${product.status.toLowerCase()}`}>{product.status}</span>
                </td>
                <td>
                  <div className="row-actions">
                    <Button asChild variant="ghost" size="icon">
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
                        <Button variant="ghost" size="icon" aria-label={`Delete ${product.name}`} title="Delete product">
                          <Trash2 size={15} />
                        </Button>
                      }
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data?.total === 0 && <div className="empty-state">No products match your filters.</div>}
      <div className="pagination">
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
