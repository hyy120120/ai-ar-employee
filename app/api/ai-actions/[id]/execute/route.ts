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

    if (action.status !== "APPROVED") {
      return NextResponse.json(
        {
          status: "error",
          message: `Action cannot be executed from ${action.status} status.`,
        },
        { status: 409 },
      );
    }

    if (action.riskLevel === "HIGH") {
      return NextResponse.json(
        {
          status: "error",
          message: "High-risk actions cannot be executed.",
        },
        { status: 403 },
      );
    }

    const executedAction = await prisma.aIAction.update({
      where: {
        id: action.id,
      },
      data: {
        status: "SENT",
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        action: "AI_ACTION_EXECUTED",
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
      message: "AI action executed successfully.",
      action: executedAction,
    });
  } catch (error) {
    console.error("AI action execution failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Unable to execute AI action.",
      },
      { status: 500 },
    );
  }
}