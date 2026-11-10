CREATE TYPE "OrderStatus" AS ENUM ('PENDING_REVIEW', 'CONFIRMED', 'REJECTED');

ALTER TABLE "ProductVariant"
  ADD COLUMN "stockOnHand" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "stockReserved" INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT "ProductVariant_stock_nonnegative" CHECK ("stockOnHand" >= 0 AND "stockReserved" >= 0),
  ADD CONSTRAINT "ProductVariant_stock_reserved_lte_on_hand" CHECK ("stockReserved" <= "stockOnHand");

CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "customerName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "deliveryAddress" TEXT NOT NULL,
  "deliveryArea" TEXT NOT NULL,
  "customerNote" TEXT NOT NULL DEFAULT '',
  "subtotal" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Order_subtotal_nonnegative" CHECK ("subtotal" >= 0)
);

CREATE TABLE "OrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT,
  "variantId" TEXT,
  "productName" TEXT NOT NULL,
  "variantName" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "lineTotal" DECIMAL(12,2) NOT NULL,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderItem_quantity_positive" CHECK ("quantity" > 0),
  CONSTRAINT "OrderItem_unit_price_nonnegative" CHECK ("unitPrice" >= 0),
  CONSTRAINT "OrderItem_line_total_nonnegative" CHECK ("lineTotal" >= 0)
);

CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;