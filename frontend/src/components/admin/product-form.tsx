"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, ExternalLink } from "lucide-react";
import { useCategoriesQuery, useChangeMutation } from "@/store/api";
import { productSchema, type Product } from "@/schemas/api";
import { Button } from "@/components/ui/button";
import { errorMessage, slugify } from "@/lib/utils";
import { VariantManager } from "./variant-manager";
import { MediaManager } from "./media-manager";

const schema = z.object({
  name: z.string().trim().min(1).max(160),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(1).max(20000),
  categoryId: z.uuid(),
  price: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),
  discountPercentage: z
    .string()
    .regex(/^\d{1,3}(\.\d{1,2})?$/)
    .refine((value) => Number(value) <= 100),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  featured: z.boolean(),
  sku: z.string().max(80),
});
type Values = z.infer<typeof schema>;

export function ProductForm({ product }: { product?: Product }) {
  const { data: categories } = useCategoriesQuery();
  const [change, { isLoading }] = useChangeMutation();
  const [message, setMessage] = useState<{ text: string; success?: boolean }>();
  const router = useRouter();
  const [slugEdited, setSlugEdited] = useState(Boolean(product));
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: product
      ? {
          name: product.name,
          slug: product.slug,
          description: product.description,
          categoryId: product.categoryId,
          price: product.price,
          discountPercentage: product.discountPercentage,
          status: product.status,
          featured: product.featured,
          sku: "",
        }
      : {
          name: "",
          slug: "",
          description: "",
          categoryId: "",
          price: "",
          discountPercentage: "0",
          status: "DRAFT",
          featured: false,
          sku: "",
        },
  });
  useEffect(() => {
    if (!isDirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest("a[href]");
      if (anchor && !window.confirm("Discard your unsaved product changes?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [isDirty]);
  async function submit(values: Values) {
    if (!product && !values.sku.trim()) {
      setError("sku", { message: "Enter a default variant SKU" });
      return;
    }
    const { sku, ...body } = values;
    setMessage(undefined);
    try {
      const saved = productSchema.parse(
        await change({
          url: product ? `/admin/products/${product.id}` : "/admin/products",
          method: product ? "PATCH" : "POST",
          body: product
            ? body
            : {
                ...body,
                status: "DRAFT",
                defaultVariant: {
                  name: "Default",
                  sku,
                  attributes: {},
                  price: null,
                  isDefault: true,
                  isActive: true,
                },
              },
        }).unwrap(),
      );
      reset(values);
      setMessage({ text: "Product saved.", success: true });
      if (!product) router.replace(`/admin/products/${saved.id}`);
    } catch (error) {
      setMessage({ text: errorMessage(error) });
    }
  }
  return (
    <>
      <Link className="back-link" href="/admin/products">
        <ArrowLeft size={15} /> Products
      </Link>
      <div className="admin-title">
        <div>
          <span className="eyebrow">Catalogue / {product ? "Edit product" : "New product"}</span>
          <h1>{product?.name || "Add product"}</h1>
        </div>
        {product?.status === "PUBLISHED" && (
          <Button asChild variant="outline">
            <Link href={`/products/${product.slug}`} target="_blank">
              Preview <ExternalLink size={15} />
            </Link>
          </Button>
        )}
      </div>
      <form className="product-edit-form" onSubmit={handleSubmit(submit)}>
        <section className="form-section">
          <h2>Product details</h2>
          <div className="form-grid">
            <label>
              Name
              <input
                {...register("name", {
                  onChange: (event) => {
                    if (!slugEdited)
                      setValue("slug", slugify(event.target.value), {
                        shouldDirty: true,
                      });
                  },
                })}
              />
            </label>
            <label>
              URL slug
              <input
                {...register("slug", {
                  onChange: () => {
                    setSlugEdited(true);
                  },
                })}
              />
            </label>
            <label className="full-width">
              Description
              <textarea rows={5} {...register("description")} />
            </label>
            <label>
              Category
              <select {...register("categoryId")}>
                <option value="">Select category</option>
                {categories?.items.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-link">
              <Link href="/admin/categories">Manage categories</Link>
            </div>
          </div>
        </section>
        <section className="form-section">
          <h2>Pricing & publishing</h2>
          <div className="form-grid">
            <label>
              Base price (BDT)
              <input inputMode="decimal" {...register("price")} />
            </label>
            <label>
              Discount (%)
              <input inputMode="decimal" {...register("discountPercentage")} />
            </label>
            <label>
              Status
              <select {...register("status")}>
                <option>DRAFT</option>
                {product && (
                  <>
                    <option>PUBLISHED</option>
                    <option>ARCHIVED</option>
                  </>
                )}
              </select>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" {...register("featured")} /> Featured product
            </label>
            {!product && (
              <label>
                Default variant SKU
                <input {...register("sku")} />
              </label>
            )}
          </div>
        </section>
        {Object.keys(errors).length > 0 && (
          <div className="status-message" role="alert">
            {Object.entries(errors).map(([field, error]) => (
              <p key={field}>
                {field}: {error.message}
              </p>
            ))}
          </div>
        )}
        {message && (
          <p className={`status-message ${message.success ? "success" : ""}`} role="status">
            {message.text}
          </p>
        )}
        <div className="form-actions">
          <Button type="submit" disabled={isLoading}>
            <Save size={16} />
            {isLoading ? "Saving..." : product ? "Save changes" : "Create draft"}
          </Button>
          {isDirty && <span className="muted">Unsaved changes</span>}
        </div>
      </form>
      {product && (
        <>
          <VariantManager product={product} />
          <MediaManager product={product} />
        </>
      )}
    </>
  );
}
