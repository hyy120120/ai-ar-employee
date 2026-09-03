import { google } from "googleapis";

export const googleOAuthScopes = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.send",
];

export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured.");
  }

  if (!clientSecret) {
    throw new Error("GOOGLE_CLIENT_SECRET is not configured.");
  }

  if (!redirectUri) {
    throw new Error("GOOGLE_REDIRECT_URI is not configured.");
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri,
  );
}