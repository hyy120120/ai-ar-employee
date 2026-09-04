import OAuthClient from "intuit-oauth";

const clientId = process.env.QUICKBOOKS_CLIENT_ID;
const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI;

if (!clientId || !clientSecret || !redirectUri) {
  throw new Error("QuickBooks OAuth environment variables are missing.");
}

export const quickBooksOAuthClient = new OAuthClient({
  clientId,
  clientSecret,
  environment: "sandbox",
  redirectUri,
});

export const quickBooksScopes = [
  "com.intuit.quickbooks.accounting",
];