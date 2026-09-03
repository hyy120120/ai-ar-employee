-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('INVOICE', 'PAYMENT', 'EMAIL', 'NOTE', 'SYSTEM');

-- CreateTable
CREATE TABLE "InvoiceEvidence" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceId" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceEvidence_invoiceId_idx" ON "InvoiceEvidence"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceEvidence_invoiceId_observedAt_idx" ON "InvoiceEvidence"("invoiceId", "observedAt");

-- AddForeignKey
ALTER TABLE "InvoiceEvidence" ADD CONSTRAINT "InvoiceEvidence_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
