import { prisma } from "@/app/lib/prisma";

import type {
  AIActionStatus,
  AIActionType,
  RiskLevel,
} from "@/app/generated/prisma/client";

type CreateAIActionInput = {
  organizationId: string;
  invoiceId: string;
  type: AIActionType;
  riskLevel: RiskLevel;
  reason: string;
  recommendation: string;
  draftSubject?: string;
  draftBody?: string;
};

export async function createAIAction(input: CreateAIActionInput) {
  const existingActiveAction = await prisma.aIAction.findFirst({
    where: {
      organizationId: input.organizationId,
      invoiceId: input.invoiceId,
      type: input.type,
      status: {
        in: ["PENDING", "APPROVED"],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (existingActiveAction) {
  return {
    action: existingActiveAction,
    created: false,
  };
}

const action = await prisma.aIAction.create({
  data: {
    organizationId: input.organizationId,
    invoiceId: input.invoiceId,
    type: input.type,
    riskLevel: input.riskLevel,
    reason: input.reason,
     recommendation: input.recommendation,
    draftSubject: input.draftSubject,
    draftBody: input.draftBody,
    status: "PENDING",
  },
});

return {
  action,
  created: true,
};
}

export async function getAIAction(
  organizationId: string,
  actionId: string,
) {
  return prisma.aIAction.findFirst({
    where: {
      id: actionId,
      organizationId,
    },
    include: {
      invoice: true,
    },
  });
}

export function isActionSendable(
  status: AIActionStatus,
  riskLevel: RiskLevel,
): boolean {
  return status === "APPROVED" && riskLevel !== "HIGH";
}