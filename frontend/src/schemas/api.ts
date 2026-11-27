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
  inStock: z.boolean().default(false),
  availableQuantity: z.number().int().nonnegative().default(0),
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

const orderStatusSchema = z.enum(["PENDING_REVIEW", "CONFIRMED", "REJECTED", "PENDING_PAYMENT", "PAYMENT_EXPIRED", "CANCELLED"]);
const paymentFields = {
  paymentMethod: z.enum(["COD", "STRIPE"]).default("COD"),
  paymentStatus: z.enum(["UNPAID", "PENDING", "PAID", "REFUND_PENDING", "REFUND_FAILED", "REFUNDED"]).default("UNPAID"),
  currency: z.literal("bdt").default("bdt"),
};
export const paymentMethodsSchema = z.object({ items: z.array(z.enum(["COD", "STRIPE"])), stripeTestMode: z.boolean() });
export const orderSchema = z.object({
  id: z.string(),
  status: orderStatusSchema,
  ...paymentFields,
  paymentReviewRequired: z.boolean().default(false),
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
  payment: z
    .object({
      status: z.enum(["INITIATING", "PENDING", "PAID", "RISK_REVIEW", "EXPIRED", "REFUND_REQUIRED", "REFUNDED"]),
      expiresAt: z.string(),
      paidAt: z.string().nullable(),
      bankTransactionId: z.string().nullable(),
      refundAmount: z.string().nullable(),
      refundReference: z.string().nullable(),
      refundNote: z.string().nullable(),
      refundedBy: z.string().nullable(),
      refundedAt: z.string().nullable(),
      duplicateCharges: z.array(
        z.object({
          id: z.string(),
          bankTransactionId: z.string().nullable(),
          refundReference: z.string().nullable(),
          refundNote: z.string().nullable(),
          refundedBy: z.string().nullable(),
          refundedAt: z.string().nullable(),
        }),
      ),
    })
    .nullable()
    .optional(),
});

export type Order = z.infer<typeof orderSchema>;
export const guestOrderSchema = orderSchema.omit({ payment: true }).extend({
  payment: z
    .object({
      status: z.enum(["INITIATING", "PENDING", "PAID", "RISK_REVIEW", "EXPIRED", "REFUND_REQUIRED", "REFUNDED"]),
      expiresAt: z.string(),
      canContinue: z.boolean(),
    })
    .nullable()
    .optional(),
});
export type GuestOrder = z.infer<typeof guestOrderSchema>;
export const orderReceiptSchema = z.object({
  id: z.string(),
  status: orderStatusSchema,
  ...paymentFields,
  checkoutUrl: z.url().nullable().optional(),
  subtotal: z.string(),
  deliveryCharge: z.string(),
  total: z.string(),
});
export type OrderReceipt = z.infer<typeof orderReceiptSchema>;
