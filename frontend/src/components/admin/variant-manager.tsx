"use client";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Check, Save, X } from "lucide-react";
import { useChangeMutation } from "@/store/api";
import type { Product, Variant } from "@/schemas/api";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { errorMessage, money } from "@/lib/utils";

const schema = z.object({
  name: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  price: z.string().regex(/^(\d{1,10}(\.\d{1,2})?)?$/),
  isDefault: z.boolean(),
  isActive: z.boolean(),
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
        <label>
          Name
          <input {...register("name")} />
        </label>
        <label>
          SKU
          <input {...register("sku")} />
        </label>
        <label>
          Price override (BDT)
          <input placeholder={`Inherit ${product.price}`} inputMode="decimal" {...register("price")} />
        </label>
        <div className="checkbox-group">
          <label className="checkbox-label">
            <input type="checkbox" {...register("isDefault")} disabled={variant?.isDefault} /> Default
          </label>
          <label className="checkbox-label">
            <input type="checkbox" {...register("isActive")} disabled={variant?.isDefault} /> Active
          </label>
        </div>
      </div>
      <div className="attribute-list">
        {fields.map((field, index) => (
          <div key={field.id} className="attribute-row">
            <label>
              Attribute
              <input placeholder="size" {...register(`attributes.${index}.key`)} />
            </label>
            <label>
              Value
              <input placeholder="M" {...register(`attributes.${index}.value`)} />
            </label>
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
