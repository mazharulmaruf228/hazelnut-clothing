CREATE TABLE "DuplicatePaymentCharge" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "validationId" TEXT NOT NULL,
  "bankTransactionId" TEXT,
  "refundReference" TEXT,
  "refundNote" TEXT,
  "refundedBy" TEXT,
  "refundedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DuplicatePaymentCharge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DuplicatePaymentCharge_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DuplicatePaymentCharge_validationId_key" ON "DuplicatePaymentCharge"("validationId");
CREATE INDEX "DuplicatePaymentCharge_paymentId_idx" ON "DuplicatePaymentCharge"("paymentId");