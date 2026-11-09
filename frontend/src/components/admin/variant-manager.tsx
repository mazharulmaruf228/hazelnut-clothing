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
    <form className="variant-editor" onSubmit={handleSubmit(submit)}>
      <div className="admin-section-heading">
        <h3>{variant ? "Edit variant" : "New variant"}</h3>
        <Button type="button" variant="ghost" size="icon" aria-label="Close variant editor" onClick={close}>
          <X size={16} />
        </Button>
      </div>
      <div className="form-grid">
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
        <div className="checkbox-group">
          <Label className="checkbox-label">
            <Controller control={control} name="isDefault" render={({ field }) => <Checkbox id="variant-default" checked={field.value} onCheckedChange={field.onChange} onBlur={field.onBlur} disabled={variant?.isDefault} ref={field.ref} />} />
            <span>Default</span>
          </Label>
          <Label className="checkbox-label">
            <Controller control={control} name="isActive" render={({ field }) => <Checkbox id="variant-active" checked={field.value} onCheckedChange={field.onChange} onBlur={field.onBlur} disabled={variant?.isDefault} ref={field.ref} />} />
            <span>Active</span>
          </Label>
        </div>
      </div>
      <div className="attribute-list">
        {fields.map((field, index) => (
          <div key={field.id} className="attribute-row">
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
        <p role="alert" className="status-message">
          {error || "Check required fields, price and unique attribute names."}
        </p>
      )}
      <div className="form-actions">
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
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <h2>Variants</h2>
          <span className="muted">{product.variants.length} options</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
          <Plus size={15} /> Add variant
        </Button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Variant</th>
              <th>Attributes</th>
              <th>Effective price</th>
              <th>Available / reserved</th>
              <th>State</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {product.variants.map((variant) => (
              <tr key={variant.id}>
                <td>
                  <strong>{variant.name}</strong>
                  <small>{variant.sku}</small>
                </td>
                <td>
                  {Object.entries(variant.attributes)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(" / ") || "-"}
                </td>
                <td>
                  {money(variant.effectivePrice)}
                  <small>{variant.price === null ? "Inherited" : "Override"}</small>
                </td>
                <td>
                  {variant.availableQuantity ?? 0} / {variant.stockReserved ?? 0}
                </td>
                <td>
                  {variant.isDefault ? (
                    <span className="status-tag published">
                      <Check size={11} /> Default
                    </span>
                  ) : variant.isActive ? (
                    "Active"
                  ) : (
                    "Inactive"
                  )}
                </td>
                <td>
                  <div className="row-actions">
                    <Button variant="ghost" size="icon" title="Edit variant" aria-label={`Edit variant ${variant.name}`} onClick={() => setEditing(variant.id)}>
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
                          <Button variant="ghost" size="icon" aria-label={`Delete variant ${variant.name}`} title="Delete variant">
                            <Trash2 size={15} />
                          </Button>
                        }
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <VariantForm key={editing} product={product} variant={product.variants.find((variant) => variant.id === editing)} close={() => setEditing(undefined)} />}
    </section>
  );
}
