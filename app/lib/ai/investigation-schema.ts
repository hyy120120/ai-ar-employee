export const investigationJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    finding: {
      type: "string",
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
    "confidence",
    "evidenceIds",
    "recommendedAction",
    "riskLevel",
  ],
} as const;