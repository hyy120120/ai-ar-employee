-- CreateTable
CREATE TABLE "InvoiceInvestigation" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "finding" TEXT NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceInvestigation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceInvestigation_invoiceId_idx" ON "InvoiceInvestigation"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceInvestigation_invoiceId_createdAt_idx" ON "InvoiceInvestigation"("invoiceId", "createdAt");

-- AddForeignKey
ALTER TABLE "InvoiceInvestigation" ADD CONSTRAINT "InvoiceInvestigation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
