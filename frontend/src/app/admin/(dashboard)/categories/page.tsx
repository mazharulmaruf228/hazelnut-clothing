"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Trash2, Plus, Save } from "lucide-react";
import type { Category } from "@/schemas/api";
import { useCategoriesQuery, useChangeMutation } from "@/store/api";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { errorMessage, slugify } from "@/lib/utils";

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
      className="form-section"
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
      <h2>{category ? "Edit category" : "New category"}</h2>
      <div className="form-grid">
        <label>
          Name
          <input
            {...register("name", {
              onChange: (event) => {
                if (!slugEdited) setValue("slug", slugify(event.target.value));
              },
            })}
          />
        </label>
        <label>
          Slug
          <input
            {...register("slug", {
              onChange: () => {
                setSlugEdited(true);
              },
            })}
          />
        </label>
        <label>
          Parent category
          <select {...register("parentId")}>
            <option value="">None (top level)</option>
            {categories
              .filter((item) => item.id !== category?.id)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Description
          <textarea {...register("description")} />
        </label>
      </div>
      {(error || Object.keys(errors).length > 0) && (
        <p className="status-message" role="alert">
          {error || "Check name, slug and description."}
        </p>
      )}
      <div className="form-actions">
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
      <div className="admin-title">
        <div>
          <span className="eyebrow">Catalogue</span>
          <h1>Categories</h1>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus size={16} /> Add category
        </Button>
      </div>
      {error && (
        <div className="status-message">
          Unable to load categories. <button onClick={refetch}>Retry</button>
        </div>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Slug</th>
              <th>Parent</th>
              <th>Products</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((category) => (
              <tr key={category.id}>
                <td>
                  <strong>{category.name}</strong>
                </td>
                <td>{category.slug}</td>
                <td>{data.items.find((parent) => parent.id === category.parentId)?.name || "-"}</td>
                <td>{category._count?.products || 0}</td>
                <td>
                  <div className="row-actions">
                    <Button variant="ghost" size="icon" title="Edit category" aria-label={`Edit ${category.name}`} onClick={() => setEditing(category.id)}>
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
                        <Button variant="ghost" size="icon" title="Delete category" aria-label={`Delete ${category.name}`}>
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
      {data?.items.length === 0 && <p className="empty-state">No categories yet.</p>}
      {editing && <CategoryForm key={editing} category={data?.items.find((category) => category.id === editing)} categories={data?.items || []} close={() => setEditing(undefined)} />}
    </>
  );
}
