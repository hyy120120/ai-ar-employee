import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import {
  getGoogleOAuthClient,
  googleOAuthScopes,
} from "@/app/lib/google/oauth";

export async function GET() {
  const state = randomBytes(32).toString("hex");

  const oauth2Client = getGoogleOAuthClient();

  const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: googleOAuthScopes,
    include_granted_scopes: true,
    prompt: "consent",
    state,
  });

  const response = NextResponse.redirect(authorizationUrl);

  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });

  return response;
}