ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_EXPIRED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'STRIPE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TYPE "OrderPaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'REFUND_PENDING', 'REFUND_FAILED', 'REFUNDED');

ALTER TABLE "Order"
  ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'COD',
  ADD COLUMN "paymentStatus" "OrderPaymentStatus" NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'bdt',
  ADD COLUMN "checkoutKeyHash" TEXT,
  ADD COLUMN "checkoutInputHash" TEXT,
  ADD COLUMN "stripeSessionId" TEXT,
  ADD COLUMN "stripeCheckoutUrl" TEXT,
  ADD COLUMN "stripePaymentIntentId" TEXT,
  ADD COLUMN "stripeRefundId" TEXT,
  ADD COLUMN "paymentExpiresAt" TIMESTAMP(3),
  ADD COLUMN "refundAttempt" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "paymentReviewRequired" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Order_checkoutKeyHash_key" ON "Order"("checkoutKeyHash");
CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");
CREATE UNIQUE INDEX "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");
CREATE UNIQUE INDEX "Order_stripeRefundId_key" ON "Order"("stripeRefundId");
CREATE INDEX "Order_paymentMethod_paymentStatus_idx" ON "Order"("paymentMethod", "paymentStatus");

CREATE TABLE "PaymentEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);