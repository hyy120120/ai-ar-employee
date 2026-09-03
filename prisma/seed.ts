import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const organization = await prisma.organization.upsert({
    where: {
      id: "seed-demo-organization",
    },
    update: {},
    create: {
      id: "seed-demo-organization",
      name: "Demo AR Company",
    },
  });

  const customer1 = await prisma.customer.upsert({
    where: {
      id: "seed-customer-acme",
    },
    update: {},
    create: {
      id: "seed-customer-acme",
      organizationId: organization.id,
      name: "Acme Design Co.",
      email: "ap@acme.example",
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: {
      id: "seed-customer-northstar",
    },
    update: {},
    create: {
      id: "seed-customer-northstar",
      organizationId: organization.id,
      name: "Northstar Consulting",
      email: "finance@northstar.example",
    },
  });

  const customer3 = await prisma.customer.upsert({
    where: {
      id: "seed-customer-pioneer",
    },
    update: {},
    create: {
      id: "seed-customer-pioneer",
      organizationId: organization.id,
      name: "Pioneer Services",
      email: "accounts@pioneer.example",
    },
  });

  const overdueInvoice = await prisma.invoice.upsert({
    where: {
      id: "seed-invoice-1001",
    },
    update: {},
    create: {
      id: "seed-invoice-1001",
      organizationId: organization.id,
      customerId: customer1.id,
      invoiceNumber: "INV-1001",
      amount: 8500,
      balanceDue: 8500,
      issueDate: new Date("2026-07-01"),
      dueDate: new Date("2026-07-31"),
      status: "OVERDUE",
    },
  });

  const secondOverdueInvoice = await prisma.invoice.upsert({
    where: {
      id: "seed-invoice-1002",
    },
    update: {},
    create: {
      id: "seed-invoice-1002",
      organizationId: organization.id,
      customerId: customer2.id,
      invoiceNumber: "INV-1002",
      amount: 4200,
      balanceDue: 4200,
      issueDate: new Date("2026-08-01"),
      dueDate: new Date("2026-08-15"),
      status: "OVERDUE",
    },
  });

  const partialInvoice = await prisma.invoice.upsert({
    where: {
      id: "seed-invoice-1003",
    },
    update: {},
    create: {
      id: "seed-invoice-1003",
      organizationId: organization.id,
      customerId: customer3.id,
      invoiceNumber: "INV-1003",
      amount: 12000,
      balanceDue: 4000,
      issueDate: new Date("2026-08-05"),
      dueDate: new Date("2026-08-20"),
      status: "PARTIALLY_PAID",
    },
  });

  await prisma.invoice.upsert({
    where: {
      id: "seed-invoice-1004",
    },
    update: {},
    create: {
      id: "seed-invoice-1004",
      organizationId: organization.id,
      customerId: customer1.id,
      invoiceNumber: "INV-1004",
      amount: 3000,
      balanceDue: 0,
      issueDate: new Date("2026-08-10"),
      dueDate: new Date("2026-08-25"),
      status: "PAID",
    },
  });

  await prisma.payment.upsert({
    where: {
      id: "seed-payment-1003",
    },
    update: {},
    create: {
      id: "seed-payment-1003",
      invoiceId: partialInvoice.id,
      amount: 8000,
      paidAt: new Date("2026-08-25"),
    },
  });

  await prisma.payment.upsert({
    where: {
      id: "seed-payment-1004",
    },
    update: {},
    create: {
      id: "seed-payment-1004",
      invoiceId: "seed-invoice-1004",
      amount: 3000,
      paidAt: new Date("2026-08-20"),
    },
  });

    await prisma.invoiceEvidence.deleteMany({
    where: {
      invoiceId: overdueInvoice.id,
    },
  });

  await prisma.invoiceEvidence.create({
    data: {
      invoiceId: overdueInvoice.id,
      type: "EMAIL",
      title: "Customer AP email",
      content:
        "Customer AP said the invoice cannot be processed until the purchase order is provided.",
      observedAt: new Date("2026-08-20"),
    },
  }); 
  
  await prisma.aIAction.upsert({
    where: {
      id: "seed-action-1001",
    },
    update: {},
    create: {
      id: "seed-action-1001",
      organizationId: organization.id,
      invoiceId: overdueInvoice.id,
      type: "REMINDER",
      status: "PENDING",
      riskLevel: "LOW",
      reason: "Invoice is overdue and no payment has been recorded.",
      recommendation: "Send a polite payment reminder.",
      draftSubject: "Payment reminder for invoice INV-1001",
      draftBody:
        "Hi, this is a friendly reminder that invoice INV-1001 is currently overdue. Please let us know if you need a copy of the invoice or have any questions.",
    },
  });

  await prisma.aIAction.upsert({
    where: {
      id: "seed-action-1002",
    },
    update: {},
    create: {
      id: "seed-action-1002",
      organizationId: organization.id,
      invoiceId: secondOverdueInvoice.id,
      type: "MISSING_PO",
      status: "PENDING",
      riskLevel: "MEDIUM",
      reason: "Invoice is overdue and may require purchase-order confirmation.",
      recommendation: "Ask the customer whether a PO is required.",
      draftSubject: "PO confirmation needed for invoice INV-1002",
      draftBody:
        "Hi, we are following up on invoice INV-1002. Could you please confirm whether a purchase order is required for this invoice?",
    },
  });

  console.log("Seed completed successfully.");
  console.log(`Organization: ${organization.name}`);
  console.log("Customers: 3");
  console.log("Invoices: 4");
  console.log("Payments: 2");
  console.log("AI actions: 2");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });