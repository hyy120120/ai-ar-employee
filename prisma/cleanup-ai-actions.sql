DELETE FROM "AIAction" a
WHERE a."status" IN ('PENDING', 'APPROVED')
  AND EXISTS (
    SELECT 1
    FROM "AIAction" newer
    WHERE newer."organizationId" = a."organizationId"
      AND newer."invoiceId" = a."invoiceId"
      AND newer."type" = a."type"
      AND newer."status" IN ('PENDING', 'APPROVED')
      AND newer."createdAt" > a."createdAt"
  );