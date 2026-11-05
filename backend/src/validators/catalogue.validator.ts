import { z } from "zod";

const money = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, "Use a nonnegative amount with at most two decimal places");
const slug = z
  .string()
  .min(1)
  .max(140)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const attributes = z.record(z.string().trim().min(1).max(40), z.string().trim().min(1).max(100)).refine((value) => Object.keys(value).length <= 20, "At most 20 attributes");

export const variantInput = z
  .object({
    sku: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .transform((value) => value.toUpperCase()),
    name: z.string().trim().min(1).max(160),
    price: money.nullable().default(null),
    attributes: attributes.default({}),
    isDefault: z.boolean().default(false),
    isActive: z.boolean().default(true),
  })
  .strict();
export const productInput = z
  .object({
    name: z.string().trim().min(1).max(160),
    slug,
    description: z.string().trim().min(1).max(20_000),
    categoryId: z.uuid(),
    price: money,
    discountPercentage: z
      .string()
      .regex(/^\d{1,3}(\.\d{1,2})?$/)
      .refine((value) => Number(value) <= 100)
      .default("0"),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
    featured: z.boolean().default(false),
  })
  .strict();
export const categoryInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    slug,
    description: z.string().max(2000).default(""),
    parentId: z.uuid().nullable().default(null),
  })
  .strict();
export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  q: z.string().trim().max(120).default(""),
  category: z.string().max(140).optional(),
  sort: z.enum(["newest", "name", "price-asc", "price-desc"]).default("newest"),
  featured: z.enum(["true", "false"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});
export const createProductInput = productInput.extend({
  defaultVariant: variantInput,
});
export const productPatch = productInput
  .extend({
    discountPercentage: productInput.shape.discountPercentage.removeDefault(),
    status: productInput.shape.status.removeDefault(),
    featured: productInput.shape.featured.removeDefault(),
  })
  .partial();
export const variantPatch = variantInput
  .extend({
    price: variantInput.shape.price.removeDefault(),
    attributes: variantInput.shape.attributes.removeDefault(),
    isDefault: variantInput.shape.isDefault.removeDefault(),
    isActive: variantInput.shape.isActive.removeDefault(),
  })
  .partial();
export const categoryPatch = categoryInput
  .extend({
    description: categoryInput.shape.description.removeDefault(),
    parentId: categoryInput.shape.parentId.removeDefault(),
  })
  .partial();
export const uploadInput = z.object({
  productId: z.uuid(),
  variantId: z.uuid().optional(),
  alt: z.string().max(300).default(""),
});
export const imagePatch = z
  .object({
    alt: z.string().max(300).optional(),
    sortOrder: z.number().int().min(0).optional(),
    variantId: z.uuid().nullable().optional(),
  })
  .strict();
export const imageOrder = z
  .object({
    imageIds: z
      .array(z.uuid())
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length, "Duplicate image IDs"),
  })
  .strict();
