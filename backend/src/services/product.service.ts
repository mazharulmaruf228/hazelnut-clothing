import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { write } from "../config/database.ts";
import { HttpError } from "../utils/http-error.ts";
import { attributeKey, effectivePrice } from "../utils/money.ts";
import { productModel, type FullProduct } from "../models/product.model.ts";
import { listQuery, type createProductInput, type productPatch } from "../validators/catalogue.validator.ts";
import { descendantIds } from "./category.service.ts";
import { assetDeletionModel } from "../models/asset-deletion.model.ts";

export function productDto(product: FullProduct, publicOnly = false) {
  const variants = product.variants
    .filter((variant) => !publicOnly || variant.isActive)
    .map((variant) => ({
      ...variant,
      price: variant.price?.toFixed(2) ?? null,
      effectivePrice: effectivePrice(product.price.toString(), variant.price?.toString() ?? null, product.discountPercentage.toString()),
    }));
  const activePrices = variants
    .filter((variant) => variant.isActive)
    .map((variant) => variant.effectivePrice)
    .sort((first, second) => Number(first) - Number(second));
  return {
    ...product,
    price: product.price.toFixed(2),
    discountPercentage: product.discountPercentage.toString(),
    variants,
    images: product.images.filter((image) => !publicOnly || !image.variantId || variants.some((variant) => variant.id === image.variantId)),
    fromPrice: activePrices[0] ?? product.price.toFixed(2),
    hasPriceRange: new Set(activePrices).size > 1,
    currency: "BDT",
  };
}

export async function assertProduct(client: Prisma.TransactionClient, productId: string) {
  const product = await productModel.findById(productId, client);
  const defaults = product.variants.filter((variant) => variant.isDefault);
  if (defaults.length !== 1 || !defaults[0].isActive) throw new HttpError(409, "A product must have exactly one active default variant");
  const keys = product.variants.map((variant) => attributeKey(variant.attributes as Record<string, string>));
  if (new Set(keys).size !== keys.length) throw new HttpError(409, "Each variant must have a unique attribute combination");
  const hasVisibleImage = product.images.some((image) => !image.variantId || product.variants.some((variant) => variant.id === image.variantId && variant.isActive));
  if (product.status === "PUBLISHED" && !hasVisibleImage) throw new HttpError(409, "Add a visible image before publishing");
  return product;
}

export async function listProducts(query: unknown, admin = false) {
  const input = listQuery.parse(query);
  const where: Prisma.ProductWhereInput = {
    ...(!admin ? { status: "PUBLISHED" } : input.status ? { status: input.status } : {}),
    ...(input.featured ? { featured: input.featured === "true" } : {}),
    ...(input.category ? { categoryId: { in: await descendantIds(input.category) } } : {}),
    ...(input.q
      ? {
          OR: [
            { name: { contains: input.q, mode: "insensitive" } },
            { description: { contains: input.q, mode: "insensitive" } },
            {
              variants: {
                some: {
                  ...(!admin ? { isActive: true } : {}),
                  sku: { contains: input.q, mode: "insensitive" },
                },
              },
            },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput[] = input.sort === "name" ? [{ name: "asc" }, { id: "asc" }] : [{ createdAt: "desc" }, { id: "asc" }];
  const items = (await productModel.list(where, orderBy)).map((product) => productDto(product, !admin));
  if (input.sort.startsWith("price")) items.sort((first, second) => (Number(first.fromPrice) - Number(second.fromPrice)) * (input.sort === "price-asc" ? 1 : -1) || first.id.localeCompare(second.id));
  return {
    items: items.slice((input.page - 1) * input.pageSize, input.page * input.pageSize),
    total: items.length,
    page: input.page,
    pageSize: input.pageSize,
    totalPages: Math.ceil(items.length / input.pageSize),
  };
}

export async function getPublishedProduct(slug: string) {
  const product = await productModel.findPublishedBySlug(slug);
  if (!product) throw new HttpError(404, "Product not found");
  return productDto(product, true);
}

export async function getAdminProduct(id: string) {
  return productDto(await productModel.findById(id));
}

export async function createProduct(input: z.infer<typeof createProductInput>) {
  const { defaultVariant, ...data } = input;
  const product = await write(async (client) => {
    const created = await productModel.create(
      {
        ...data,
        variants: {
          create: { ...defaultVariant, isDefault: true, isActive: true },
        },
      },
      client,
    );
    return assertProduct(client, created.id);
  });
  return productDto(product);
}

export async function updateProduct(id: string, input: z.infer<typeof productPatch>) {
  return productDto(
    await write(async (client) => {
      await productModel.update(id, input, client);
      return assertProduct(client, id);
    }),
  );
}

export async function deleteProduct(id: string) {
  await write(async (client) => {
    const product = await productModel.findById(id, client);
    await assetDeletionModel.enqueue(
      product.images.map((image) => image.publicId),
      client,
    );
    await productModel.delete(id, client);
  });
}
