import { prisma } from "@/app/lib/prisma";
import { quickBooksOAuthClient } from "@/app/lib/quickbooks/oauth";

const organizationId = "seed-demo-organization";

export async function getQuickBooksClient() {
  const connection = await prisma.quickBooksConnection.findUnique({
    where: {
      organizationId,
    },
  });

  if (!connection) {
    throw new Error("QuickBooks is not connected.");
  }

  if (!connection.accessToken) {
    throw new Error("QuickBooks access token is missing.");
  }

  quickBooksOAuthClient.setToken({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
  });

  return {
    client: quickBooksOAuthClient,
    realmId: connection.realmId,
  };
}