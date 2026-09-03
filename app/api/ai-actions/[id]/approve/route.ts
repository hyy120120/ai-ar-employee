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
    // This will be replaced by the authenticated user's organization
    // when authentication is implemented.
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
          message: `Action cannot be approved from ${action.status} status.`,
        },
        { status: 409 },
      );
    }

    if (action.riskLevel === "HIGH") {
      return NextResponse.json(
        {
          status: "error",
          message: "High-risk actions require manual handling.",
        },
        { status: 403 },
      );
    }

    const approvedAction = await prisma.aIAction.update({
      where: {
        id: action.id,
      },
      data: {
        status: "APPROVED",
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        action: "AI_ACTION_APPROVED",
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
      action: approvedAction,
    });
  } catch (error) {
    console.error("AI action approval failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Unable to approve AI action.",
      },
      { status: 500 },
    );
  }
}