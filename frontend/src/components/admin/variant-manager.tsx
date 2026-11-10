"use client";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Check, Save, X } from "lucide-react";
import { useChangeMutation } from "@/store/api";
import type { Product, Variant } from "@/schemas/api";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { errorMessage, money } from "@/lib/utils";

const schema = z.object({
  name: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  price: z.string().regex(/^(\d{1,10}(\.\d{1,2})?)?$/),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  stockOnHand: z.string().regex(/^\d{1,7}$/),
  attributes: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(40),
        value: z.string().trim().min(1).max(100),
      }),
    )
    .max(20)
    .refine((items) => new Set(items.map((item) => item.key.toLowerCase())).size === items.length, "Attribute names must be unique"),
});
type Values = z.infer<typeof schema>;
function VariantForm({ product, variant, close }: { product: Product; variant?: Variant; close: () => void }) {
  const [change, { isLoading }] = useChangeMutation();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: variant?.name || "",
      sku: variant?.sku || "",
      price: variant?.price ?? "",
      isDefault: variant?.isDefault || false,
      isActive: variant?.isActive ?? true,
      stockOnHand: String(variant?.stockOnHand ?? 0),
      attributes: Object.entries(variant?.attributes || {}).map(([key, value]) => ({ key, value })),
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "attributes",
  });
  async function submit(values: Values) {
    setError("");
    try {
      await change({
        url: variant ? `/admin/variants/${variant.id}` : `/admin/products/${product.id}/variants`,
        method: variant ? "PATCH" : "POST",
        body: {
          ...values,
          price: values.price || null,
          stockOnHand: Number(values.stockOnHand),
          attributes: Object.fromEntries(values.attributes.map((item) => [item.key, item.value])),
        },
      }).unwrap();
      close();
    } catch (error) {
      setError(errorMessage(error));
    }
  }
  return (
    <form className="mt-5 border-t border-line py-6" aria-label="Variant editor" onSubmit={handleSubmit(submit)}>
      <div className="mb-5 flex items-center justify-between gap-[15px]">
        <h3>{variant ? "Edit variant" : "New variant"}</h3>
        <Button type="button" variant="ghost" size="icon" aria-label="Close variant editor" onClick={close}>
          <X size={16} />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-5 max-[700px]:grid-cols-1 max-[700px]:gap-4">
        <Label>
          Name
          <Input {...register("name")} />
        </Label>
        <Label>
          SKU
          <Input {...register("sku")} />
        </Label>
        <Label>
          Price override (BDT)
          <Input placeholder={`Inherit ${product.price}`} inputMode="decimal" {...register("price")} />
        </Label>
        <Label>
          Stock on hand
          <Input type="number" min="0" max="1000000" {...register("stockOnHand")} />
        </Label>
        <div className="flex items-center gap-[25px]">
          <Label className="flex min-h-10 items-center gap-[9px]">
            <Controller control={control} name="isDefault" render={({ field }) => <Checkbox id="variant-default" checked={field.value} onCheckedChange={field.onChange} onBlur={field.onBlur} disabled={variant?.isDefault} ref={field.ref} />} />
            <span>Default</span>
          </Label>
          <Label className="flex min-h-10 items-center gap-[9px]">
            <Controller control={control} name="isActive" render={({ field }) => <Checkbox id="variant-active" checked={field.value} onCheckedChange={field.onChange} onBlur={field.onBlur} disabled={variant?.isDefault} ref={field.ref} />} />
            <span>Active</span>
          </Label>
        </div>
      </div>
      <div className="my-5 grid gap-3">
        {fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_40px] items-end gap-3 max-[700px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_30px] max-[700px]:gap-2">
            <Label>
              Attribute
              <Input placeholder="size" {...register(`attributes.${index}.key`)} />
            </Label>
            <Label>
              Value
              <Input placeholder="M" {...register(`attributes.${index}.value`)} />
            </Label>
            <Button type="button" variant="ghost" size="icon" aria-label="Remove attribute" onClick={() => remove(index)}>
              <Trash2 size={15} />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => append({ key: "", value: "" })}>
        <Plus size={14} /> Attribute
      </Button>
      {(error || Object.keys(errors).length > 0) && (
        <p role="alert" className="mt-[15px] rounded-[4px] border border-[#e4bfb4] bg-[#fff1ec] p-3 text-xs text-[#873723]">
          {error || "Check required fields, price and unique attribute names."}
        </p>
      )}
      <div className="mt-[22px] flex flex-wrap items-center gap-3 text-[11px]">
        <Button disabled={isLoading}>
          <Save size={15} /> Save variant
        </Button>
        <Button type="button" variant="ghost" onClick={close}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
export function VariantManager({ product }: { product: Product }) {
  const [editing, setEditing] = useState<string>();
  const [change] = useChangeMutation();
  return (
    <section className="mt-[35px] border-t border-line pt-[25px]">
      <div className="mb-5 flex items-center justify-between gap-[15px]">
        <div>
          <h2 className="font-sans text-[17px] font-[550] leading-[1.3]">Variants</h2>
          <span className="mt-[5px] block text-[11px] text-muted">{product.variants.length} options</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
          <Plus size={15} /> Add variant
        </Button>
      </div>
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variant</TableHead>
              <TableHead>Attributes</TableHead>
              <TableHead>Effective price</TableHead>
              <TableHead>Available / reserved</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {product.variants.map((variant) => (
              <TableRow key={variant.id}>
                <TableCell className="min-w-[180px]">
                  <strong>{variant.name}</strong>
                  <small className="mt-1 block text-[10px] text-muted">{variant.sku}</small>
                </TableCell>
                <TableCell>
                  {Object.entries(variant.attributes)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(" / ") || "-"}
                </TableCell>
                <TableCell>
                  {money(variant.effectivePrice)}
                  <small className="mt-1 block text-[10px] text-muted">{variant.price === null ? "Inherited" : "Override"}</small>
                </TableCell>
                <TableCell>
                  {variant.availableQuantity ?? 0} / {variant.stockReserved ?? 0}
                </TableCell>
                <TableCell>
                  {variant.isDefault ? (
                    <StatusBadge tone="positive">
                      <Check size={11} /> Default
                    </StatusBadge>
                  ) : variant.isActive ? (
                    "Active"
                  ) : (
                    "Inactive"
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-[3px] whitespace-nowrap">
                    <Button className="!h-8 !min-h-8 !w-8" variant="ghost" size="icon" title="Edit variant" aria-label={`Edit variant ${variant.name}`} onClick={() => setEditing(variant.id)}>
                      <Pencil size={15} />
                    </Button>
                    {!variant.isDefault && (
                      <Confirm
                        title="Delete variant?"
                        description={`Remove ${variant.name} and its variant-specific images?`}
                        onConfirm={() =>
                          change({
                            url: `/admin/variants/${variant.id}`,
                            method: "DELETE",
                          }).unwrap()
                        }
                        trigger={
                          <Button className="!h-8 !min-h-8 !w-8" variant="ghost" size="icon" aria-label={`Delete variant ${variant.name}`} title="Delete variant">
                            <Trash2 size={15} />
                          </Button>
                        }
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {editing && <VariantForm key={editing} product={product} variant={product.variants.find((variant) => variant.id === editing)} close={() => setEditing(undefined)} />}
    </section>
  );
}
