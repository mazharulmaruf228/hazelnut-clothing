ALTER TABLE "Payment" ADD COLUMN "nextReconcileAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "Payment_status_nextReconcileAt_idx" ON "Payment"("status", "nextReconcileAt");