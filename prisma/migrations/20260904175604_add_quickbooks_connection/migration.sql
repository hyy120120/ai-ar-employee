-- CreateTable
CREATE TABLE "QuickBooksConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "realmId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "companyName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickBooksConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuickBooksConnection_organizationId_key" ON "QuickBooksConnection"("organizationId");

-- CreateIndex
CREATE INDEX "QuickBooksConnection_organizationId_idx" ON "QuickBooksConnection"("organizationId");

-- AddForeignKey
ALTER TABLE "QuickBooksConnection" ADD CONSTRAINT "QuickBooksConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
