import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

import { prisma } from "@/app/lib/prisma";
import { getGoogleOAuthClient } from "@/app/lib/google/oauth";

const DEMO_ORGANIZATION_ID = "seed-demo-organization";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.json(
        {
          error: "Google authorization was denied.",
          details: error,
        },
        { status: 400 },
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        {
          error: "Missing OAuth code or state.",
        },
        { status: 400 },
      );
    }

    const storedState = request.cookies.get(
      "google_oauth_state",
    )?.value;

    if (!storedState || storedState !== state) {
      return NextResponse.json(
        {
          error: "Invalid OAuth state.",
        },
        { status: 400 },
      );
    }

    const oauth2Client = getGoogleOAuthClient();

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      return NextResponse.json(
        {
          error: "Google did not return an access token.",
        },
        { status: 400 },
      );
    }

    if (!tokens.refresh_token) {
      return NextResponse.json(
        {
          error:
            "Google did not return a refresh token. Re-authorize the app and try again.",
        },
        { status: 400 },
      );
    }

    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      version: "v2",
      auth: oauth2Client,
    });

    const { data: userInfo } = await oauth2.userinfo.get();

    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : null;

    await prisma.googleConnection.upsert({
      where: {
        organizationId: DEMO_ORGANIZATION_ID,
      },
      create: {
        organizationId: DEMO_ORGANIZATION_ID,
        email: userInfo.email ?? null,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: expiresAt,
        scope: tokens.scope ?? null,
      },
      update: {
        email: userInfo.email ?? null,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: expiresAt,
        scope: tokens.scope ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: DEMO_ORGANIZATION_ID,
        action: "GOOGLE_CONNECTED",
        entityType: "GoogleConnection",
        metadata: {
          email: userInfo.email ?? null,
          scope: tokens.scope ?? null,
        },
      },
    });

    const response = NextResponse.redirect(
      new URL("/?google=connected", request.url),
    );

    response.cookies.delete("google_oauth_state");

    return response;
  } catch (error) {
    console.error("Google OAuth callback failed:", error);

    return NextResponse.json(
      {
        error: "Google OAuth callback failed.",
      },
      { status: 500 },
    );
  }
}