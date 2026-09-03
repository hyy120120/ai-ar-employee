import { groq, groqModel } from "./groq";

export type CollectionEmailDraft = {
  subject: string;
  body: string;
};

type CollectionEmailContext = {
  invoice: {
    invoiceNumber: string;
    balanceDue: number;
    dueDate: string;
  };
  customer: {
    name: string;
    email: string | null;
  };
  investigation: {
    finding: string;
    recommendedAction: string;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
  };
};

const collectionEmailJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    subject: {
      type: "string",
    },
    body: {
      type: "string",
    },
  },
  required: ["subject", "body"],
} as const;

export async function draftCollectionEmail(
  context: CollectionEmailContext,
): Promise<CollectionEmailDraft> {
  const response = await groq.chat.completions.create({
    model: groqModel,
    messages: [
      {
        role: "system",
        content: `
You are an accounts receivable email drafting assistant.

Your job is to draft a professional, concise follow-up email
for an overdue B2B invoice.

Rules:
- Use only the information provided.
- Never invent facts.
- Do not invent a payment date.
- Do not threaten legal action.
- Do not negotiate payment plans.
- Do not make promises on behalf of the company.
- Do not claim that a payment was received unless the data says so.
- Clearly reference the invoice number.
- Be polite and professional.
- Ask for the specific next step described by the investigation.
- Keep the email concise.
- Return only the requested JSON structure.
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
        name: "collection_email_draft",
        strict: true,
        schema: collectionEmailJsonSchema,
      },
    },
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Groq returned an empty collection email draft.");
  }

  const draft = JSON.parse(content) as CollectionEmailDraft;

  if (!draft.subject.trim() || !draft.body.trim()) {
    throw new Error("AI returned an incomplete collection email draft.");
  }

  return draft;
}