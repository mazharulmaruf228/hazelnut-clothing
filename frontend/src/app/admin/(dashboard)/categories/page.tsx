"use client";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Trash2, Plus, Save } from "lucide-react";
import type { Category } from "@/schemas/api";
import { useCategoriesQuery, useChangeMutation } from "@/store/api";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { errorMessage, slugify } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(2000),
  parentId: z.string(),
});
function CategoryForm({ category, categories, close }: { category?: Category; categories: Category[]; close: () => void }) {
  const [change, { isLoading }] = useChangeMutation();
  const [error, setError] = useState("");
  const [slugEdited, setSlugEdited] = useState(Boolean(category));
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: category?.name || "",
      slug: category?.slug || "",
      description: category?.description || "",
      parentId: category?.parentId || "",
    },
  });
  return (
    <form
      className="border-t border-line py-[25px]"
      onSubmit={handleSubmit(async (values) => {
        setError("");
        try {
          await change({
            url: category ? `/admin/categories/${category.id}` : "/admin/categories",
            method: category ? "PATCH" : "POST",
            body: { ...values, parentId: values.parentId || null },
          }).unwrap();
          reset();
          close();
        } catch (error) {
          setError(errorMessage(error));
        }
      })}
    >
      <h2 className="mb-5">{category ? "Edit category" : "New category"}</h2>
      <div className="grid grid-cols-2 gap-5 max-[700px]:grid-cols-1 max-[700px]:gap-4">
        <Label>
          Name
          <Input
            {...register("name", {
              onChange: (event) => {
                if (!slugEdited) setValue("slug", slugify(event.target.value));
              },
            })}
          />
        </Label>
        <Label>
          Slug
          <Input
            {...register("slug", {
              onChange: () => {
                setSlugEdited(true);
              },
            })}
          />
        </Label>
        <Label>
          Parent category
          <Controller
            control={control}
            name="parentId"
            render={({ field }) => (
              <Select value={field.value || "none"} onValueChange={(value) => field.onChange(value === "none" ? "" : value)}>
                <SelectTrigger aria-label="Parent category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top level)</SelectItem>
                  {categories
                    .filter((item) => item.id !== category?.id)
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          />
        </Label>
        <Label>
          Description
          <Textarea {...register("description")} />
        </Label>
      </div>
      {(error || Object.keys(errors).length > 0) && (
        <p className="rounded-[4px] border border-[#e4bfb4] bg-[#fff1ec] p-3 text-xs text-[#873723]" role="alert">
          {error || "Check name, slug and description."}
        </p>
      )}
      <div className="mt-[22px] flex flex-wrap items-center gap-3 text-[11px]">
        <Button disabled={isLoading}>
          <Save size={15} /> Save category
        </Button>
        <Button type="button" variant="ghost" onClick={close}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
export default function Categories() {
  const { data, error, refetch } = useCategoriesQuery();
  const [editing, setEditing] = useState<string>();
  const [change] = useChangeMutation();
  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-5 max-[700px]:mb-6 max-[700px]:items-start max-[700px]:gap-3">
        <div>
          <span className="text-[9px] uppercase tracking-[1.6px] text-muted">Catalogue</span>
          <h1 className="mt-2 overflow-wrap-anywhere font-sans text-[28px] font-medium leading-[1.2] max-[700px]:text-[25px]">Categories</h1>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus size={16} /> Add category
        </Button>
      </div>
      {error && (
        <div className="rounded-[4px] border border-[#e4bfb4] bg-[#fff1ec] p-3 text-xs text-[#873723]">
          Unable to load categories.{" "}
          <Button variant="ghost" onClick={refetch}>
            Retry
          </Button>
        </div>
      )}
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="min-w-[180px]">
                  <strong>{category.name}</strong>
                </TableCell>
                <TableCell>{category.slug}</TableCell>
                <TableCell>{data.items.find((parent) => parent.id === category.parentId)?.name || "-"}</TableCell>
                <TableCell>{category._count?.products || 0}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-[3px] whitespace-nowrap">
                    <Button className="!h-8 !min-h-8 !w-8" variant="ghost" size="icon" title="Edit category" aria-label={`Edit ${category.name}`} onClick={() => setEditing(category.id)}>
                      <Pencil size={15} />
                    </Button>
                    <Confirm
                      title="Delete category?"
                      description="Reassign products and child categories before deleting this category."
                      onConfirm={() =>
                        change({
                          url: `/admin/categories/${category.id}`,
                          method: "DELETE",
                        }).unwrap()
                      }
                      trigger={
                        <Button className="!h-8 !min-h-8 !w-8" variant="ghost" size="icon" title="Delete category" aria-label={`Delete ${category.name}`}>
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
      {data?.items.length === 0 && <p className="min-h-[250px] px-5 py-20 text-center">No categories yet.</p>}
      {editing && <CategoryForm key={editing} category={data?.items.find((category) => category.id === editing)} categories={data?.items || []} close={() => setEditing(undefined)} />}
    </>
  );
}
