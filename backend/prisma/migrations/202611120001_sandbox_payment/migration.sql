CREATE TYPE "PaymentStatus" AS ENUM ('INITIATING', 'PENDING', 'PAID', 'RISK_REVIEW', 'EXPIRED', 'REFUND_REQUIRED', 'REFUNDED');

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATING',
  "idempotencyKey" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,
  "transactionId" VARCHAR(30) NOT NULL,
  "sessionKey" TEXT,
  "gatewayUrl" TEXT,
  "validationId" TEXT,
  "bankTransactionId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "refundAmount" DECIMAL(12,2),
  "refundReference" TEXT,
  "refundNote" TEXT,
  "refundedBy" TEXT,
  "refundedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Payment_refundAmount_nonnegative" CHECK ("refundAmount" IS NULL OR "refundAmount" >= 0),
  CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE UNIQUE INDEX "Payment_transactionId_key" ON "Payment"("transactionId");
CREATE UNIQUE INDEX "Payment_sessionKey_key" ON "Payment"("sessionKey");
CREATE UNIQUE INDEX "Payment_validationId_key" ON "Payment"("validationId");
CREATE INDEX "Payment_status_expiresAt_idx" ON "Payment"("status", "expiresAt");