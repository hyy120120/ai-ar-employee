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

type SendGmailEmailResult = {
  email: string;
  messageId: string | null;
};

async function getGmailClient(organizationId: string) {
  const connection = await prisma.googleConnection.findUnique({
    where: {
      organizationId,
    },
  });

  if (!connection) {
    throw new Error("Gmail is not connected.");
  }

  if (!connection.email) {
    throw new Error(
      "Connected Gmail account has no email address.",
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

  return {
    connection,
    oauth2Client,
    gmail,
  };
}

export async function sendGmailEmail({
  organizationId,
  to,
  subject,
  body,
}: {
  organizationId: string;
  to: string;
  subject: string;
  body: string;
}): Promise<SendGmailEmailResult> {
  if (!to.trim()) {
    throw new Error("Recipient email address is required.");
  }

  if (!subject.trim()) {
    throw new Error("Email subject is required.");
  }

  if (!body.trim()) {
    throw new Error("Email body is required.");
  }

  const {
    connection,
    oauth2Client,
    gmail,
  } = await getGmailClient(organizationId);

  const rawMessage = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
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
    refreshedCredentials.access_token !== connection.accessToken
  ) {
    await prisma.googleConnection.update({
      where: {
        organizationId,
      },
      data: {
        accessToken: refreshedCredentials.access_token,
        tokenExpiresAt: refreshedCredentials.expiry_date
          ? new Date(refreshedCredentials.expiry_date)
          : connection.tokenExpiresAt,
      },
    });
  }

  return {
    email: to,
    messageId: response.data.id ?? null,
  };
}

type SendTestEmailResult = {
  email: string;
  messageId: string | null;
};

export async function sendTestGmailEmail(
  organizationId: string,
): Promise<SendTestEmailResult> {
  const connection = await prisma.googleConnection.findUnique({
    where: {
      organizationId,
    },
  });

  if (!connection) {
    throw new Error("Gmail is not connected.");
  }

  if (!connection.email) {
    throw new Error(
      "Connected Gmail account has no email address.",
    );
  }

  const subject =
    "AI AR Employee — Gmail connection test";

  const body = [
    "This is a test email from AI AR Employee.",
    "",
    "Gmail connection is working successfully.",
    "",
    "The AI AR Employee can now use this Gmail account for approved collection emails.",
    "",
    "This was a controlled test. No customer was contacted.",
  ].join("\n");

  return sendGmailEmail({
    organizationId,
    to: connection.email,
    subject,
    body,
  });
}

type IncomingGmailMessage = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
};

function decodeGmailBody(data?: string | null): string {
  if (!data) {
    return "";
  }

  return Buffer.from(
    data.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  ).toString("utf8");
}

function extractGmailBody(
  payload: {
    body?: { data?: string | null } | null;
    parts?: Array<{
      mimeType?: string | null;
      body?: { data?: string | null } | null;
      parts?: Array<{
        mimeType?: string | null;
        body?: { data?: string | null } | null;
      }>;
    }>;
  },
): string {
  if (payload.body?.data) {
    return decodeGmailBody(payload.body.data);
  }

  for (const part of payload.parts ?? []) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return decodeGmailBody(part.body.data);
    }

    const nestedBody = part.parts
      ? extractGmailBody({
          body: part.body,
          parts: part.parts,
        })
      : "";

    if (nestedBody) {
      return nestedBody;
    }
  }

  return "";
}

export async function getRecentIncomingGmailMessages(
  organizationId: string,
): Promise<IncomingGmailMessage[]> {
  const { gmail, oauth2Client, connection } =
    await getGmailClient(organizationId);

  const response = await gmail.users.messages.list({
    userId: "me",
    q: "in:inbox",
    maxResults: 20,
  });

  const messageIds = response.data.messages ?? [];

  const messages: IncomingGmailMessage[] = [];

  for (const message of messageIds) {
    if (!message.id) {
      continue;
    }

    const result = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      format: "full",
    });

    const payload = result.data.payload;

    if (!payload) {
      continue;
    }

    const headers = payload.headers ?? [];

    const getHeader = (name: string) =>
      headers.find(
        (header) =>
          header.name?.toLowerCase() === name.toLowerCase(),
      )?.value ?? "";

    messages.push({
      id: result.data.id ?? message.id,
      threadId: result.data.threadId ?? "",
      from: getHeader("From"),
      to: getHeader("To"),
      subject: getHeader("Subject"),
      date: getHeader("Date"),
      body: extractGmailBody(payload),
    });
  }

  const refreshedCredentials = oauth2Client.credentials;

  if (
    refreshedCredentials.access_token &&
    refreshedCredentials.access_token !== connection.accessToken
  ) {
    await prisma.googleConnection.update({
      where: {
        organizationId,
      },
      data: {
        accessToken: refreshedCredentials.access_token,
        tokenExpiresAt: refreshedCredentials.expiry_date
          ? new Date(refreshedCredentials.expiry_date)
          : connection.tokenExpiresAt,
      },
    });
  }

  return messages;
}