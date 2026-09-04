import { groq, groqModel } from "./groq";
import { investigationJsonSchema } from "./investigation-schema";

export type AIInvestigation = {
  finding: string;
  confidence: number;
  evidenceIds: string[];
  recommendedAction: string;
   actionType:
    | "REMINDER"
    | "RESEND_INVOICE"
    | "PAYMENT_DATE_REQUEST"
    | "MISSING_PO"
    | "DISPUTE"
    | "PAYMENT_PROMISE"
    | "ESCALATE";
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
};

type InvestigationContext = {
  invoice: {
    invoiceNumber: string;
    amount: number;
    balanceDue: number;
    issueDate: string;
    dueDate: string;
    status: string;
  };
  customer: {
    name: string;
  };
  payments: Array<{
    amount: number;
    paidAt: string;
  }>;
  evidence: Array<{
    id: string;
    type: string;
    title: string;
    content: string;
    observedAt: string;
  }>;
};

export async function investigateWithGroq(
  context: InvestigationContext,
): Promise<AIInvestigation> {
  const response = await groq.chat.completions.create({
    model: groqModel,
    messages: [
      {
        role: "system",
        content: `
You are an accounts receivable investigation assistant.

Your job is to determine the most likely reason an overdue B2B invoice
has not been paid and recommend the safest next action.

Rules:
- Use only the information provided in the invoice, payment, and evidence data.
- Never invent facts.
- Only reference evidence using IDs that exist in the provided evidence list.
- If the evidence is insufficient, say so in the finding.

Choose exactly one actionType from these values:

REMINDER:
Use for a normal overdue-payment follow-up when there is no specific blocker.

RESEND_INVOICE:
Use when the evidence indicates the customer did not receive the invoice,
needs the invoice resent, or the invoice needs to be provided again.

PAYMENT_DATE_REQUEST:
Use when the invoice is overdue and the appropriate next step is to ask
the customer for an expected payment date.

MISSING_PO:
Use when payment is blocked because a purchase order or PO information
is missing or required.

DISPUTE:
Use when the customer disputes the invoice amount, invoice validity,
goods/services, or another material aspect of the invoice.

PAYMENT_PROMISE:
Use only when the provided evidence explicitly indicates that the customer
has made or discussed a commitment to pay. Do not invent a payment promise.

ESCALATE:
Use when the situation requires human judgment, including legal threats,
angry/escalated customers, unresolved disputes, or other high-risk situations.

Risk rules:
- Use HIGH risk for disputes, legal threats, angry/escalated customers,
  or other situations requiring human judgment.
- Use MEDIUM risk when human review is advisable.
- Use LOW risk for routine collection follow-up.

Safety rules:
- Do not recommend legal action.
- Do not negotiate payment plans.
- Do not resolve disputes autonomously.
- Do not invent payment dates, payment promises, PO numbers, or customer statements.
- The actionType must match the finding and recommendedAction.
        `.trim(),
      },
      {
        role: "user",
        content: JSON.stringify(context),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "invoice_investigation",
        strict: true,
        schema: investigationJsonSchema,
      },
    },
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Groq returned an empty investigation response.");
  }

  const result = JSON.parse(content) as AIInvestigation;

  return result;
}