import { groq, groqModel } from "./groq";
import { investigationJsonSchema } from "./investigation-schema";

export type AIInvestigation = {
  finding: string;
  confidence: number;
  evidenceIds: string[];
  recommendedAction: string;
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
- Do not recommend legal action.
- Do not negotiate payment plans.
- Do not resolve disputes autonomously.
- Use HIGH risk for disputes, legal threats, angry/escalated customers,
  or other situations requiring human judgment.
- Use MEDIUM risk when human review is advisable.
- Use LOW risk for routine collection follow-up.
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