/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,externalId]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,externalId]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Customer_organizationId_externalId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Customer_organizationId_externalId_key" ON "Customer"("organizationId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_organizationId_externalId_key" ON "Invoice"("organizationId", "externalId");
