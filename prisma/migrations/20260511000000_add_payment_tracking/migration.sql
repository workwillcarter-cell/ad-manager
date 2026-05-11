-- Per-card payment tracking: separate flags + amounts for AIG and Editor sides.
-- Amounts are nullable; null falls back to a type-based default in the UI.
ALTER TABLE "Creative" ADD COLUMN "aigPaid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Creative" ADD COLUMN "aigPaymentAmount" DOUBLE PRECISION;
ALTER TABLE "Creative" ADD COLUMN "editorPaid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Creative" ADD COLUMN "editorPaymentAmount" DOUBLE PRECISION;
