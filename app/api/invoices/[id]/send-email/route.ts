import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

import { prisma } from "@/app/lib/prisma";
import { getGoogleOAuthClient } from "@/app/lib/google/oauth";

function encodeBase64Url(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    const body = await request.json();

    const subject =
      typeof body.subject === "string"
        ? body.subject.trim()
        : "";

    const emailBody =
      typeof body.body === "string"
        ? body.body.trim()
        : "";

    if (!subject || !emailBody) {
      return NextResponse.json(
        {
          error: "Subject and email body are required.",
        },
        { status: 400 },
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: {
        id,
      },
      include: {
        customer: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        {
          error: "Invoice not found.",
        },
        { status: 404 },
      );
    }

    if (!invoice.customer.email) {
      return NextResponse.json(
        {
          error: "Customer does not have an email address.",
        },
        { status: 400 },
      );
    }

    if (Number(invoice.balanceDue) <= 0) {
      return NextResponse.json(
        {
          error: "This invoice has no outstanding balance.",
        },
        { status: 400 },
      );
    }

    const connection =
      await prisma.googleConnection.findUnique({
        where: {
          organizationId: invoice.organizationId,
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

    const oauth2Client = getGoogleOAuthClient();

    oauth2Client.setCredentials({
      access_token: connection.accessToken ?? undefined,
      refresh_token: connection.refreshToken,
      expiry_date: connection.tokenExpiresAt?.getTime(),
    });

    const gmail = google.gmail({
      version: "v1",
      auth: oauth2Client,
    });

    const rawMessage = [
      `To: ${invoice.customer.email}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=UTF-8",
      "",
      emailBody,
    ].join("\r\n");

    const encodedMessage = encodeBase64Url(rawMessage);

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });

    const refreshedCredentials = oauth2Client.credentials;

    if (
      refreshedCredentials.access_token &&
      refreshedCredentials.access_token !==
        connection.accessToken
    ) {
      await prisma.googleConnection.update({
        where: {
          organizationId: invoice.organizationId,
        },
        data: {
          accessToken: refreshedCredentials.access_token,
          tokenExpiresAt:
            refreshedCredentials.expiry_date
              ? new Date(refreshedCredentials.expiry_date)
              : connection.tokenExpiresAt,
        },
      });
    }

    const pendingAction =
      await prisma.aIAction.findFirst({
        where: {
          organizationId: invoice.organizationId,
          invoiceId: invoice.id,
          status: "PENDING",
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    if (pendingAction) {
      await prisma.aIAction.update({
        where: {
          id: pendingAction.id,
        },
        data: {
          status: "SENT",
          draftSubject: subject,
          draftBody: emailBody,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: invoice.organizationId,
        action: "COLLECTION_EMAIL_SENT",
        entityType: "Invoice",
        entityId: invoice.id,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          customerEmail: invoice.customer.email,
          subject,
          gmailMessageId: response.data.id ?? null,
          aiActionId: pendingAction?.id ?? null,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Collection email sent to ${invoice.customer.email}.`,
      messageId: response.data.id ?? null,
    });
  } catch (error) {
    console.error(
      "Collection email send failed:",
      error,
    );

    return NextResponse.json(
      {
        error: "Failed to send collection email.",
      },
      { status: 500 },
    );
  }
}