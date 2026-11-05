ALTER TABLE "Product" ADD CONSTRAINT "Product_price_nonnegative" CHECK ("price" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_discount_range" CHECK ("discountPercentage" >= 0 AND "discountPercentage" <= 100);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "Variant_price_nonnegative" CHECK ("price" IS NULL OR "price" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "Variant_attributes_object" CHECK (jsonb_typeof("attributes") = 'object');
ALTER TABLE "ProductVariant" ADD CONSTRAINT "Default_variant_active" CHECK (NOT "isDefault" OR "isActive");
CREATE UNIQUE INDEX "ProductVariant_one_default" ON "ProductVariant" ("productId") WHERE "isDefault" = true;