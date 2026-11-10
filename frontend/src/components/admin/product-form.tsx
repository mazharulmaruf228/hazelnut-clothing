"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, ExternalLink } from "lucide-react";
import { useCategoriesQuery, useChangeMutation } from "@/store/api";
import { productSchema, type Product } from "@/schemas/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  const [navigationConfirmation, setNavigationConfirmation] = useState(false);
  const [pendingHref, setPendingHref] = useState("");
  const router = useRouter();
  const [slugEdited, setSlugEdited] = useState(Boolean(product));
  const {
    register,
    handleSubmit,
    control,
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
      const anchor = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.href === window.location.href) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(`${destination.pathname}${destination.search}${destination.hash}`);
      setNavigationConfirmation(true);
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
      <Link className="mb-[22px] inline-flex items-center gap-2 text-xs" href="/admin/products">
        <ArrowLeft size={15} /> Products
      </Link>
      <div className="mb-8 flex items-center justify-between gap-5 max-[700px]:mb-6 max-[700px]:items-start max-[700px]:gap-3">
        <div>
          <span className="text-[9px] uppercase tracking-[1.6px] text-muted">Catalogue / {product ? "Edit product" : "New product"}</span>
          <h1 className="mt-2 overflow-wrap-anywhere font-sans text-[28px] font-medium leading-[1.2] max-[700px]:text-[25px]">{product?.name || "Add product"}</h1>
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
        <section className="border-t border-line py-[25px]">
          <h2 className="mb-5">Product details</h2>
          <div className="grid grid-cols-2 gap-5 max-[700px]:grid-cols-1 max-[700px]:gap-4">
            <Label>
              Name
              <Input
                {...register("name", {
                  onChange: (event) => {
                    if (!slugEdited)
                      setValue("slug", slugify(event.target.value), {
                        shouldDirty: true,
                      });
                  },
                })}
              />
            </Label>
            <Label>
              URL slug
              <Input
                {...register("slug", {
                  onChange: () => {
                    setSlugEdited(true);
                  },
                })}
              />
            </Label>
            <Label className="col-span-full max-[700px]:col-auto">
              Description
              <Textarea rows={5} {...register("description")} />
            </Label>
            <Label>
              Category
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger ref={field.ref} onBlur={field.onBlur} aria-label="Category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.items.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Label>
            <div className="flex items-center text-xs underline">
              <Link href="/admin/categories">Manage categories</Link>
            </div>
          </div>
        </section>
        <section className="border-t border-line py-[25px]">
          <h2 className="mb-5">Pricing & publishing</h2>
          <div className="grid grid-cols-2 gap-5 max-[700px]:grid-cols-1 max-[700px]:gap-4">
            <Label>
              Base price (BDT)
              <Input inputMode="decimal" {...register("price")} />
            </Label>
            <Label>
              Discount (%)
              <Input inputMode="decimal" {...register("discountPercentage")} />
            </Label>
            <Label>
              Status
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger ref={field.ref} onBlur={field.onBlur} aria-label="Status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">DRAFT</SelectItem>
                      {product && <SelectItem value="PUBLISHED">PUBLISHED</SelectItem>}
                      {product && <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>}
                    </SelectContent>
                  </Select>
                )}
              />
            </Label>
            <Label className="flex min-h-10 items-center gap-[9px]">
              <Controller control={control} name="featured" render={({ field }) => <Checkbox id="featured" name={field.name} checked={field.value} onCheckedChange={field.onChange} onBlur={field.onBlur} ref={field.ref} />} />
              <span>Featured product</span>
            </Label>
            {!product && (
              <Label>
                Default variant SKU
                <Input {...register("sku")} />
              </Label>
            )}
          </div>
        </section>
        {Object.keys(errors).length > 0 && (
          <div className="mt-[15px] rounded-[4px] border border-[#e4bfb4] bg-[#fff1ec] p-3 text-xs text-[#873723]" role="alert">
            {Object.entries(errors).map(([field, error]) => (
              <p key={field}>
                {field}: {error.message}
              </p>
            ))}
          </div>
        )}
        {message && (
          <p className={`mt-[15px] rounded-[4px] border p-3 text-xs ${message.success ? "border-[#b9d1bf] bg-[#eff7ef] text-[#285039]" : "border-[#e4bfb4] bg-[#fff1ec] text-[#873723]"}`} role="status">
            {message.text}
          </p>
        )}
        <div className="mt-[22px] flex flex-wrap items-center gap-3 text-[11px]">
          <Button type="submit" disabled={isLoading}>
            <Save size={16} />
            {isLoading ? "Saving..." : product ? "Save changes" : "Create draft"}
          </Button>
          {isDirty && <span className="text-muted">Unsaved changes</span>}
        </div>
      </form>
      {product && (
        <>
          <VariantManager product={product} />
          <MediaManager product={product} />
        </>
      )}
      <AlertDialog open={navigationConfirmation} onOpenChange={setNavigationConfirmation}>
        <AlertDialogContent>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>Your product changes have not been saved. Leave this page and discard them?</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Continue editing</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={() => pendingHref && router.push(pendingHref)}>
                Discard and leave
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
