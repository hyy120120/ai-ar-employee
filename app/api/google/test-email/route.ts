import { NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";
import { sendTestGmailEmail } from "@/app/lib/google/gmail";

const DEMO_ORGANIZATION_ID = "seed-demo-organization";

export async function POST() {
  try {
    const connection = await prisma.googleConnection.findUnique({
      where: {
        organizationId: DEMO_ORGANIZATION_ID,
      },
      select: {
        email: true,
      },
    });

    if (!connection) {
      return NextResponse.json(
        {
          error: "Gmail is not connected.",
        },
        { status: 400 },
      );
    }

    const result = await sendTestGmailEmail(
      DEMO_ORGANIZATION_ID,
    );

    await prisma.auditLog.create({
      data: {
        organizationId: DEMO_ORGANIZATION_ID,
        action: "GMAIL_TEST_EMAIL_SENT",
        entityType: "GoogleConnection",
        metadata: {
          email: result.email,
          messageId: result.messageId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${result.email}.`,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Gmail test email failed:", error);

    return NextResponse.json(
      {
        error: "Failed to send Gmail test email.",
      },
      { status: 500 },
    );
  }
}