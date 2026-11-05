"use client";
import { use } from "react";
import { useProductQuery } from "@/store/api";
import { ProductForm } from "@/components/admin/product-form";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/utils";

export default function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, error, refetch } = useProductQuery(id);
  if (isLoading) return <p role="status">Loading product...</p>;
  if (!data)
    return (
      <div className="empty-state">
        <h2>Unable to load product.</h2>
        <p>{errorMessage(error)}</p>
        <Button onClick={refetch}>Retry</Button>
      </div>
    );
  return <ProductForm key={data.id} product={data} />;
}
