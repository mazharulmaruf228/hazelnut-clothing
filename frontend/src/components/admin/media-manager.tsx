"use client";
import Image from "next/image";
import { useState } from "react";
import { Upload, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import type { Product } from "@/schemas/api";
import { useUploadMutation, useChangeMutation } from "@/store/api";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { errorMessage } from "@/lib/utils";

export function MediaManager({ product }: { product: Product }) {
  const [upload, { isLoading }] = useUploadMutation();
  const [change] = useChangeMutation();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function edit(id: string, body: unknown) {
    setError("");
    try {
      await change({
        url: `/admin/images/${id}`,
        method: "PATCH",
        body,
      }).unwrap();
    } catch (error) {
      setError(errorMessage(error));
    }
  }
  async function reorder(index: number, direction: number) {
    const other = product.images[index + direction];
    if (!other) return;
    setBusy(true);
    setError("");
    const imageIds = product.images.map((image) => image.id);
    [imageIds[index], imageIds[index + direction]] = [imageIds[index + direction], imageIds[index]];
    try {
      await change({
        url: `/admin/products/${product.id}/images/order`,
        method: "PATCH",
        body: { imageIds },
      }).unwrap();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <h2>Images</h2>
        <span className="muted">{product.images.length} images</span>
      </div>
      <form
        className="upload-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          data.set("productId", product.id);
          if (!data.get("variantId")) data.delete("variantId");
          setError("");
          try {
            await upload(data).unwrap();
            form.reset();
          } catch (error) {
            setError(errorMessage(error));
          }
        }}
      >
        <label>
          Product photographs
          <input type="file" name="images" accept="image/jpeg,image/png,image/webp,image/avif" multiple required />
        </label>
        <div className="form-grid">
          <label>
            Assign to
            <select name="variantId">
              <option value="">All variants</option>
              {product.variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Alt text
            <input name="alt" maxLength={300} />
          </label>
        </div>
        <Button disabled={isLoading}>
          <Upload size={15} />
          {isLoading ? "Uploading..." : "Upload images"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="status-message">
          {error}
        </p>
      )}
      <div className="media-list">
        {product.images.map((image, index) => (
          <div className="media-row" key={image.id}>
            <div className="media-preview">
              <Image src={image.imageUrl} alt={image.alt || product.name} fill sizes="72px" />
            </div>
            <label>
              Alt text
              <input
                key={image.alt}
                defaultValue={image.alt}
                onBlur={(event) => {
                  if (event.target.value !== image.alt) void edit(image.id, { alt: event.target.value });
                }}
              />
            </label>
            <label>
              Variant
              <select value={image.variantId || ""} onChange={(event) => void edit(image.id, { variantId: event.target.value || null })}>
                <option value="">All variants</option>
                {product.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="row-actions">
              <Button variant="ghost" size="icon" disabled={index === 0 || busy} title="Move image up" aria-label="Move image up" onClick={() => void reorder(index, -1)}>
                <ArrowUp size={15} />
              </Button>
              <Button variant="ghost" size="icon" disabled={index === product.images.length - 1 || busy} title="Move image down" aria-label="Move image down" onClick={() => void reorder(index, 1)}>
                <ArrowDown size={15} />
              </Button>
              <Confirm
                title="Delete image?"
                description="Remove this image from the product and image storage?"
                onConfirm={() =>
                  change({
                    url: `/admin/images/${image.id}`,
                    method: "DELETE",
                  }).unwrap()
                }
                trigger={
                  <Button variant="ghost" size="icon" title="Delete image" aria-label="Delete image">
                    <Trash2 size={15} />
                  </Button>
                }
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
