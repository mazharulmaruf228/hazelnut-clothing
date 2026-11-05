import type { z } from "zod";
import { write } from "../config/database.ts";
import { HttpError } from "../utils/http-error.ts";
import { categoryModel } from "../models/category.model.ts";
import type { categoryInput, categoryPatch } from "../validators/catalogue.validator.ts";

export const listCategories = () => categoryModel.list();

export async function listPublicCategories() {
  const categories = await categoryModel.listPublishedCounts();
  const visible = new Set(categories.filter((category) => category._count.products > 0).map((category) => category.id));
  for (let pass = 0; pass < categories.length; pass++) {
    for (const category of categories) if (visible.has(category.id) && category.parentId) visible.add(category.parentId);
  }
  return categories.filter((category) => visible.has(category.id));
}

export async function descendantIds(slug: string): Promise<string[]> {
  const categories = await categoryModel.list();
  const root = categories.find((category) => category.slug === slug);
  if (!root) return [];
  const ids = new Set([root.id]);
  for (let pass = 0; pass < categories.length; pass++) {
    for (const category of categories) if (category.parentId && ids.has(category.parentId)) ids.add(category.id);
  }
  return [...ids];
}

export function createCategory(input: z.infer<typeof categoryInput>) {
  return write((client) => categoryModel.create(input, client));
}

export function updateCategory(id: string, input: z.infer<typeof categoryPatch>) {
  return write(async (client) => {
    let parent = input.parentId;
    const visited = new Set([id]);
    while (parent) {
      if (visited.has(parent)) throw new HttpError(409, "Categories cannot contain a cycle");
      visited.add(parent);
      parent = (await categoryModel.findById(parent, client)).parentId;
    }
    return categoryModel.update(id, input, client);
  });
}

export function deleteCategory(id: string) {
  return write((client) => categoryModel.delete(id, client));
}
