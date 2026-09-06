-- CreateEnum
CREATE TYPE "PaymentPromiseStatus" AS ENUM ('PROMISED', 'PARTIAL', 'FULFILLED', 'BROKEN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentPromiseSource" AS ENUM ('MANUAL', 'EMAIL', 'AI');

-- CreateTable
CREATE TABLE "PaymentPromise" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "promisedAmount" DECIMAL(12,2) NOT NULL,
    "promisedDate" TIMESTAMP(3) NOT NULL,
    "status" "PaymentPromiseStatus" NOT NULL DEFAULT 'PROMISED',
    "source" "PaymentPromiseSource" NOT NULL DEFAULT 'MANUAL',
    "confidence" DECIMAL(5,4),
    "note" TEXT,
    "fulfilledAt" TIMESTAMP(3),
    "brokenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentPromise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentPromise_organizationId_idx" ON "PaymentPromise"("organizationId");

-- CreateIndex
CREATE INDEX "PaymentPromise_invoiceId_idx" ON "PaymentPromise"("invoiceId");

-- CreateIndex
CREATE INDEX "PaymentPromise_organizationId_status_idx" ON "PaymentPromise"("organizationId", "status");

-- CreateIndex
CREATE INDEX "PaymentPromise_promisedDate_idx" ON "PaymentPromise"("promisedDate");

-- AddForeignKey
ALTER TABLE "PaymentPromise" ADD CONSTRAINT "PaymentPromise_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPromise" ADD CONSTRAINT "PaymentPromise_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
