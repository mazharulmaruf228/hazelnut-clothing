ALTER TABLE "Order"
  ALTER COLUMN "deliveryArea" SET DEFAULT '',
  ADD COLUMN "district" TEXT,
  ADD COLUMN "postcode" TEXT,
  ADD COLUMN "deliveryCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD CONSTRAINT "Order_deliveryCharge_nonnegative" CHECK ("deliveryCharge" >= 0);
