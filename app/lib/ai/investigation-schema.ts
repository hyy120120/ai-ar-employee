export const investigationJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    finding: {
      type: "string",
    },
    actionType: {
  type: "string",
  enum: [
    "REMINDER",
    "RESEND_INVOICE",
    "PAYMENT_DATE_REQUEST",
    "MISSING_PO",
    "DISPUTE",
    "PAYMENT_PROMISE",
    "ESCALATE",
  ],
},
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    evidenceIds: {
      type: "array",
      items: {
        type: "string",
      },
    },
    recommendedAction: {
      type: "string",
    },
    riskLevel: {
      type: "string",
      enum: ["LOW", "MEDIUM", "HIGH"],
    },
  },
  required: [
    "finding",
    "actionType",
    "confidence",
    "evidenceIds",
    "recommendedAction",
    "riskLevel",
  ],
} as const;