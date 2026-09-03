import { prisma } from "@/app/lib/prisma";

export async function getDashboardData() {
  const organization = await prisma.organization.findUnique({
    where: {
      id: "seed-demo-organization",
    },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  const [invoices, pendingActions] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        organizationId: organization.id,
      },
      include: {
        customer: true,
      },
      orderBy: {
        dueDate: "asc",
      },
    }),

    prisma.aIAction.findMany({
      where: {
        organizationId: organization.id,
        status: "PENDING",
      },
      include: {
        invoice: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const totalOutstanding = invoices.reduce(
    (total, invoice) => total + Number(invoice.balanceDue),
    0,
  );

  const overdueInvoices = invoices.filter(
    (invoice) =>
      Number(invoice.balanceDue) > 0 &&
      invoice.dueDate < new Date(),
  );

  const totalOverdue = overdueInvoices.reduce(
    (total, invoice) => total + Number(invoice.balanceDue),
    0,
  );

  const totalCollected = invoices.reduce(
    (total, invoice) =>
      total + (Number(invoice.amount) - Number(invoice.balanceDue)),
    0,
  );

  return {
    organization,
    invoices,
    pendingActions,
    metrics: {
      totalOutstanding,
      totalOverdue,
      totalCollected,
      pendingActions: pendingActions.length,
    },
  };
}