import { z } from "zod";

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  parentId: z.string().nullable(),
  _count: z.object({ products: z.number() }).optional(),
});

export const variantSchema = z.object({
  id: z.string(),
  productId: z.string(),
  sku: z.string(),
  name: z.string(),
  price: z.string().nullable(),
  effectivePrice: z.string(),
  attributes: z.record(z.string(), z.string()),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  inStock: z.boolean(),
  availableQuantity: z.number().int().nonnegative(),
  stockOnHand: z.number().optional(),
  stockReserved: z.number().optional(),
});

export const imageSchema = z.object({
  id: z.string(),
  productId: z.string(),
  variantId: z.string().nullable(),
  imageUrl: z.url(),
  alt: z.string(),
  sortOrder: z.number(),
});

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  categoryId: z.string(),
  category: categorySchema,
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  featured: z.boolean(),
  price: z.string(),
  discountPercentage: z.string(),
  fromPrice: z.string(),
  hasPriceRange: z.boolean(),
  currency: z.literal("BDT"),
  variants: z.array(variantSchema),
  images: z.array(imageSchema),
});

export const productListSchema = z.object({
  items: z.array(productSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

export const categoryListSchema = z.object({ items: z.array(categorySchema) });
export type Product = z.infer<typeof productSchema>;
export type ProductList = z.infer<typeof productListSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Variant = z.infer<typeof variantSchema>;
export type ProductImage = z.infer<typeof imageSchema>;
export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "EDITOR";
  isActive: boolean;
  approvedAt: string | null;
};
export const orderItemSchema = z.object({
  id: z.string(),
  productId: z.string().nullable(),
  variantId: z.string().nullable(),
  productName: z.string(),
  variantName: z.string(),
  sku: z.string(),
  quantity: z.number(),
  unitPrice: z.string(),
  lineTotal: z.string(),
});

export const orderSchema = z.object({
  id: z.string(),
  status: z.enum(["PENDING_REVIEW", "CONFIRMED", "REJECTED"]),
  customerName: z.string(),
  email: z.string(),
  phone: z.string(),
  deliveryAddress: z.string(),
  deliveryArea: z.string(),
  district: z.string().nullable(),
  postcode: z.string().nullable(),
  customerNote: z.string(),
  subtotal: z.string(),
  deliveryCharge: z.string(),
  total: z.string(),
  items: z.array(orderItemSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Order = z.infer<typeof orderSchema>;
export const orderReceiptSchema = z.object({
  id: z.string(),
  status: z.enum(["PENDING_REVIEW", "CONFIRMED", "REJECTED"]),
  subtotal: z.string(),
  deliveryCharge: z.string(),
  total: z.string(),
});
export type OrderReceipt = z.infer<typeof orderReceiptSchema>;
