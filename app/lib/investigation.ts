import { prisma } from "@/app/lib/prisma";

export type InvestigationResult = {
  finding: string;
  confidence: number;
  evidence: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  recommendedAction: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
};

export async function investigateInvoice(
  invoiceId: string,
): Promise<InvestigationResult> {
  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
    include: {
      customer: true,
      payments: true,
      evidence: {
        orderBy: {
          observedAt: "desc",
        },
      },
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const balanceDue = Number(invoice.balanceDue);

  if (balanceDue <= 0) {
    return {
      finding: "Invoice is fully paid.",
      confidence: 1,
      evidence: [],
      recommendedAction: "No collection action required.",
      riskLevel: "LOW",
    };
  }

  const isOverdue = invoice.dueDate.getTime() < Date.now();

  if (!isOverdue) {
    return {
      finding: "Invoice is not overdue.",
      confidence: 1,
      evidence: [],
      recommendedAction: "Monitor until the due date.",
      riskLevel: "LOW",
    };
  }

  const evidence = invoice.evidence.map((item) => ({
    id: item.id,
    title: item.title,
    content: item.content,
  }));

  const purchaseOrderEvidence = invoice.evidence.find((item) => {
    const text =
      `${item.title} ${item.content}`.toLowerCase();

    return (
      text.includes("purchase order") ||
      text.includes("po required") ||
      text.includes("missing po")
    );
  });

  if (purchaseOrderEvidence) {
    return {
      finding:
        "Payment may be blocked by a missing purchase order.",
      confidence: 0.92,
      evidence: [purchaseOrderEvidence],
      recommendedAction:
        "Ask the customer AP team to confirm the required PO and provide the invoice against it.",
      riskLevel: "MEDIUM",
    };
  }

  return {
    finding:
      "Invoice is overdue and requires collection follow-up.",
    confidence: 0.75,
    evidence,
    recommendedAction:
      "Send a payment-status request asking for the expected payment date.",
    riskLevel: "LOW",
  };
}   