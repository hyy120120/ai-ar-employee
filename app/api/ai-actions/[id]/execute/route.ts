import { NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";
import { sendGmailEmail } from "@/app/lib/google/gmail";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ExecuteRequestBody = {
  subject?: string;
  body?: string;
  customerEmail?: string;
};

export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;

    const body =
      (await request.json()) as ExecuteRequestBody;

    const subject = body.subject?.trim();
    const emailBody = body.body?.trim();
    const customerEmail = body.customerEmail?.trim();

    if (!subject || !emailBody || !customerEmail) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Email recipient, subject, and body are required.",
        },
        { status: 400 },
      );
    }

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

    const invoice = action.invoiceId
      ? await prisma.invoice.findFirst({
          where: {
            id: action.invoiceId,
            organizationId,
          },
          include: {
            customer: true,
          },
        })
      : null;

    if (!invoice) {
      return NextResponse.json(
        {
          status: "error",
          message: "Invoice associated with this action was not found.",
        },
        { status: 404 },
      );
    }

    if (!invoice.customer.email) {
      return NextResponse.json(
        {
          status: "error",
          message: "Customer does not have an email address.",
        },
        { status: 400 },
      );
    }

    if (
      invoice.customer.email.toLowerCase() !==
      customerEmail.toLowerCase()
    ) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Recipient email does not match the invoice customer.",
        },
        { status: 400 },
      );
    }

    const gmailResult = await sendGmailEmail({
      organizationId,
      to: customerEmail,
      subject,
      body: emailBody,
    });

    const executedAction = await prisma.aIAction.update({
      where: {
        id: action.id,
      },
      data: {
        status: "SENT",
        draftSubject: subject,
        draftBody: emailBody,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        action: "AI_COLLECTION_EMAIL_SENT",
        entityType: "AIAction",
        entityId: action.id,
        metadata: {
          invoiceId: action.invoiceId,
          actionType: action.type,
          riskLevel: action.riskLevel,
          recipient: customerEmail,
          subject,
          gmailMessageId: gmailResult.messageId,
        },
      },
    });

    return NextResponse.json({
      status: "ok",
      message: "Collection email sent successfully.",
      email: gmailResult.email,
      messageId: gmailResult.messageId,
      action: executedAction,
    });
  } catch (error) {
    console.error(
      "AI collection email execution failed:",
      error,
    );

    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to send collection email.",
      },
      { status: 500 },
    );
  }
}