import { NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";
import { getQuickBooksClient } from "@/app/lib/quickbooks/client";

const organizationId = "seed-demo-organization";

type QuickBooksCustomer = {
  Id: string;
  DisplayName?: string;
  CompanyName?: string;
  PrimaryEmailAddr?: {
    Address?: string;
  };
};

type QuickBooksInvoice = {
  Id: string;
  DocNumber?: string;
  TxnDate?: string;
  DueDate?: string;
  TotalAmt?: number;
  Balance?: number;
  CustomerRef?: {
    value?: string;
    name?: string;
  };
};

export async function POST() {
  try {
    const { client, realmId } = await getQuickBooksClient();

    const customerResponse = await client.makeApiCall({
      url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=${encodeURIComponent(
        "SELECT * FROM Customer MAXRESULTS 100",
      )}&minorversion=75`,
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const customerData = customerResponse.json;

    const customers =
      (customerData.QueryResponse?.Customer ??
        []) as QuickBooksCustomer[];

    const customerMap = new Map<string, string>();

    for (const qbCustomer of customers) {
      const customer = await prisma.customer.upsert({
        where: {
          organizationId_externalId: {
            organizationId,
            externalId: `quickbooks:${qbCustomer.Id}`,
          },
        },
        create: {
          organizationId,
          externalId: `quickbooks:${qbCustomer.Id}`,
          name:
            qbCustomer.CompanyName ??
            qbCustomer.DisplayName ??
            "Unknown Customer",
          email: qbCustomer.PrimaryEmailAddr?.Address ?? null,
        },
        update: {
          name:
            qbCustomer.CompanyName ??
            qbCustomer.DisplayName ??
            "Unknown Customer",
          email: qbCustomer.PrimaryEmailAddr?.Address ?? null,
        },
      });

      customerMap.set(qbCustomer.Id, customer.id);
    }

    const invoiceResponse = await client.makeApiCall({
      url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=${encodeURIComponent(
        "SELECT * FROM Invoice MAXRESULTS 100",
      )}&minorversion=75`,
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const invoiceData = invoiceResponse.json;

    const invoices =
      (invoiceData.QueryResponse?.Invoice ??
        []) as QuickBooksInvoice[];

    let synced = 0;
    let skipped = 0;

    for (const qbInvoice of invoices) {
      const qbCustomerId = qbInvoice.CustomerRef?.value;

      if (!qbCustomerId) {
        skipped++;
        continue;
      }

      const customerId = customerMap.get(qbCustomerId);

      if (!customerId) {
        skipped++;
        continue;
      }

      const totalAmount = Number(qbInvoice.TotalAmt ?? 0);
      const balance = Number(qbInvoice.Balance ?? 0);
      const amountPaid = Math.max(totalAmount - balance, 0);

      const issueDate = qbInvoice.TxnDate
        ? new Date(qbInvoice.TxnDate)
        : new Date();
      
      const dueDate = qbInvoice.DueDate
        ? new Date(qbInvoice.DueDate)
        : issueDate;

      let status:
        | "OPEN"
        | "OVERDUE"
        | "PAID"
        | "PARTIALLY_PAID" = "OPEN";

      if (balance <= 0) {
        status = "PAID";
      } else if (dueDate && dueDate < new Date()) {
        status = amountPaid > 0 ? "PARTIALLY_PAID" : "OVERDUE";
      } else if (amountPaid > 0) {
        status = "PARTIALLY_PAID";
      }

      await prisma.invoice.upsert({
        where: {
          organizationId_externalId: {
            organizationId,
            externalId: `quickbooks:${qbInvoice.Id}`,
          },
        },
        create: {
          organizationId,
          customerId,
          externalId: `quickbooks:${qbInvoice.Id}`,
          invoiceNumber: qbInvoice.DocNumber ?? `QB-${qbInvoice.Id}`,
          issueDate,
          dueDate,
          amount: totalAmount,
          balanceDue: balance,
          status,
        },
        update: {
          customerId,
          invoiceNumber:
            qbInvoice.DocNumber ?? `QB-${qbInvoice.Id}`,
          issueDate,
          dueDate,
          amount: totalAmount,
          balanceDue: balance,
          status,
        },
      });

      synced++;
    }

    await prisma.auditLog.create({
      data: {
        organizationId,
        action: "QUICKBOOKS_INVOICES_SYNCED",
        entityType: "QuickBooksConnection",
        metadata: {
          customersSynced: customers.length,
          invoicesSynced: synced,
          invoicesSkipped: skipped,
        },
      },
    });

    return NextResponse.json({
      status: "ok",
      customersSynced: customers.length,
      invoicesSynced: synced,
      invoicesSkipped: skipped,
    });
  } catch (error) {
    console.error("QuickBooks sync failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to sync QuickBooks data.",
      },
      { status: 500 },
    );
  }
}