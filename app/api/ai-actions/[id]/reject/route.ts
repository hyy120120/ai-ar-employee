import { NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;

    // Temporary demo organization scope.
    // This will be replaced by authenticated organization scope later.
    const organizationId = "seed-demo-organization";

    const action = await prisma.aIAction.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!action) {
      return NextResponse.json(
        {
          status: "error",
          message: "AI action not found.",
        },
        { status: 404 },
      );
    }

    if (action.status !== "PENDING") {
      return NextResponse.json(
        {
          status: "error",
          message: `Action cannot be rejected from ${action.status} status.`,
        },
        { status: 409 },
      );
    }

    const rejectedAction = await prisma.aIAction.update({
      where: {
        id: action.id,
      },
      data: {
        status: "REJECTED",
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        action: "AI_ACTION_REJECTED",
        entityType: "AIAction",
        entityId: action.id,
        metadata: {
          invoiceId: action.invoiceId,
          actionType: action.type,
          riskLevel: action.riskLevel,
        },
      },
    });

    return NextResponse.json({
      status: "ok",
      action: rejectedAction,
    });
  } catch (error) {
    console.error("AI action rejection failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Unable to reject AI action.",
      },
      { status: 500 },
    );
  }
}