import { prisma } from "@/app/lib/prisma";
import { createAIAction } from "./actions";
import {
  investigateWithGroq,
  type AIInvestigation,
} from "./ai/investigate-with-groq";

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

function validateAIResult(
  result: AIInvestigation,
  evidenceIds: Set<string>,
): void {
  if (
    !Number.isFinite(result.confidence) ||
    result.confidence < 0 ||
    result.confidence > 1
  ) {
    throw new Error("AI returned an invalid confidence score.");
  }

  const hasUnknownEvidence = result.evidenceIds.some(
    (id) => !evidenceIds.has(id),
  );

  if (hasUnknownEvidence) {
    throw new Error("AI referenced evidence that was not provided.");
  }
}

export async function investigateInvoice(
  invoiceId: string,
): Promise<InvestigationResult> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      payments: true,
      evidence: {
        orderBy: { observedAt: "desc" },
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

  const context = {
    invoice: {
      invoiceNumber: invoice.invoiceNumber,
      amount: Number(invoice.amount),
      balanceDue,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      status: invoice.status,
    },
    customer: {
      name: invoice.customer.name,
    },
    payments: invoice.payments.map((payment) => ({
      amount: Number(payment.amount),
      paidAt: payment.paidAt.toISOString(),
    })),
    evidence: invoice.evidence.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      content: item.content,
      observedAt: item.observedAt.toISOString(),
    })),
  };

  const aiResult = await investigateWithGroq(context);

  validateAIResult(
    aiResult,
    new Set(invoice.evidence.map((item) => item.id)),
  );

  await prisma.invoiceInvestigation.create({
  data: {
    invoiceId: invoice.id,
    finding: aiResult.finding,
    confidence: aiResult.confidence,
    recommendedAction: aiResult.recommendedAction,
    riskLevel: aiResult.riskLevel,
  },
});

await createAIAction({
  organizationId: invoice.organizationId,
  invoiceId: invoice.id,
  type: "REMINDER",
  riskLevel: aiResult.riskLevel,
  reason: aiResult.finding,
  recommendation: aiResult.recommendedAction,
});

  const evidenceById = new Map(
    invoice.evidence.map((item) => [item.id, item]),
  );

  return {
    finding: aiResult.finding,
    confidence: aiResult.confidence,
    evidence: aiResult.evidenceIds
      .map((id) => evidenceById.get(id))
      .filter((item): item is (typeof invoice.evidence)[number] => Boolean(item))
      .map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
      })),
    recommendedAction: aiResult.recommendedAction,
    riskLevel: aiResult.riskLevel,
  };
}