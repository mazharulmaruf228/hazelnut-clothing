"use client";
import Image from "next/image";
import { useState } from "react";
import { Upload, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import type { Product } from "@/schemas/api";
import { useUploadMutation, useChangeMutation } from "@/store/api";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { errorMessage } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function MediaManager({ product }: { product: Product }) {
  const [upload, { isLoading }] = useUploadMutation();
  const [change] = useChangeMutation();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadVariantId, setUploadVariantId] = useState("");

  async function edit(id: string, body: unknown) {
    setError("");
    try {
      await change({ url: `/admin/images/${id}`, method: "PATCH", body }).unwrap();
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
      await change({ url: `/admin/products/${product.id}/images/order`, method: "PATCH", body: { imageIds } }).unwrap();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-[35px] border-t border-line pt-[25px]">
      <div className="mb-5 flex items-center justify-between gap-[15px]">
        <h2 className="font-sans text-[17px] font-[550] leading-[1.3]">Images</h2>
        <span className="text-[11px] text-muted">{product.images.length} images</span>
      </div>
      <form
        className="grid gap-[18px] border-b border-line pb-[25px]"
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
            setUploadVariantId("");
          } catch (error) {
            setError(errorMessage(error));
          }
        }}
      >
        <Label>
          Product photographs
          <input type="file" name="images" accept="image/jpeg,image/png,image/webp,image/avif" multiple required />
        </Label>
        <div className="grid grid-cols-2 gap-5 max-[700px]:grid-cols-1 max-[700px]:gap-4">
          <Label>
            Assign to
            <Select value={uploadVariantId || "all"} onValueChange={(value) => setUploadVariantId(value === "all" ? "" : value)}>
              <SelectTrigger aria-label="Assign to variant">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All variants</SelectItem>
                {product.variants.map((variant) => (
                  <SelectItem key={variant.id} value={variant.id}>
                    {variant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="variantId" value={uploadVariantId} />
          </Label>
          <Label>
            Alt text
            <Input name="alt" maxLength={300} />
          </Label>
        </div>
        <Button className="justify-self-start" disabled={isLoading}>
          <Upload size={15} />
          {isLoading ? "Uploading..." : "Upload images"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-4 rounded-[4px] border border-[#e4bfb4] bg-[#fff1ec] p-3 text-xs text-[#873723]">
          {error}
        </p>
      )}
      <div className="mt-[25px] grid gap-[15px]">
        {product.images.map((image, index) => (
          <div className="grid grid-cols-[65px_minmax(100px,1fr)_minmax(100px,1fr)_auto] items-center gap-[15px] border-b border-line pb-[15px] max-[1050px]:grid-cols-[55px_minmax(80px,1fr)_minmax(80px,1fr)] max-[700px]:grid-cols-[50px_minmax(0,1fr)] max-[700px]:gap-3" key={image.id}>
            <div className="relative h-20 w-[65px] overflow-hidden rounded-[3px] max-[700px]:row-span-2 max-[700px]:h-[66px] max-[700px]:w-[50px]">
              <Image src={image.imageUrl} alt={image.alt || product.name} fill sizes="72px" />
            </div>
            <Label className="max-[700px]:col-start-2">
              Alt text
              <Input
                key={image.alt}
                defaultValue={image.alt}
                onBlur={(event) => {
                  if (event.target.value !== image.alt) void edit(image.id, { alt: event.target.value });
                }}
              />
            </Label>
            <Label className="max-[700px]:col-start-2">
              Variant
              <Select value={image.variantId || "all"} onValueChange={(value) => void edit(image.id, { variantId: value === "all" ? null : value })}>
                <SelectTrigger aria-label={`Variant for image ${index + 1}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All variants</SelectItem>
                  {product.variants.map((variant) => (
                    <SelectItem key={variant.id} value={variant.id}>
                      {variant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Label>
            <div className="flex items-center gap-[3px] whitespace-nowrap max-[1050px]:col-start-2 max-[1050px]:col-end-[-1] max-[700px]:col-start-2 max-[700px]:col-end-[-1]">
              <Button className="!h-8 !min-h-8 !w-8" variant="ghost" size="icon" disabled={index === 0 || busy} title="Move image up" aria-label="Move image up" onClick={() => void reorder(index, -1)}>
                <ArrowUp size={15} />
              </Button>
              <Button className="!h-8 !min-h-8 !w-8" variant="ghost" size="icon" disabled={index === product.images.length - 1 || busy} title="Move image down" aria-label="Move image down" onClick={() => void reorder(index, 1)}>
                <ArrowDown size={15} />
              </Button>
              <Confirm
                title="Delete image?"
                description="Remove this image from the product and image storage?"
                onConfirm={() => change({ url: `/admin/images/${image.id}`, method: "DELETE" }).unwrap()}
                trigger={
                  <Button className="!h-8 !min-h-8 !w-8" variant="ghost" size="icon" title="Delete image" aria-label="Delete image">
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
