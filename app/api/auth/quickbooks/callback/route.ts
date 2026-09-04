import { NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";
import { quickBooksOAuthClient } from "@/app/lib/quickbooks/oauth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const realmId = url.searchParams.get("realmId");

    if (!code || !realmId) {
      return NextResponse.json(
        {
          status: "error",
          message: "Missing QuickBooks authorization code or realmId.",
        },
        { status: 400 },
      );
    }

    const tokenResponse =
      await quickBooksOAuthClient.createToken(url.toString());

    const token = tokenResponse.getJson();

    const organizationId = "seed-demo-organization";

    await prisma.quickBooksConnection.upsert({
      where: {
        organizationId,
      },
      create: {
        organizationId,
        realmId,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        tokenExpiresAt: token.expires_in
          ? new Date(Date.now() + token.expires_in * 1000)
          : null,
        scope: token.scope ?? null,
      },
      update: {
        realmId,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        tokenExpiresAt: token.expires_in
          ? new Date(Date.now() + token.expires_in * 1000)
          : null,
        scope: token.scope ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        action: "QUICKBOOKS_CONNECTED",
        entityType: "QuickBooksConnection",
        metadata: {
          realmId,
        },
      },
    });

    return NextResponse.redirect(
      new URL("/", request.url),
    );
  } catch (error) {
    console.error("QuickBooks OAuth callback failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Unable to complete QuickBooks connection.",
      },
      { status: 500 },
    );
  }
}