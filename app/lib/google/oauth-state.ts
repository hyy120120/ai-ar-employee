import crypto from "node:crypto";

export function generateOAuthState() {
  return crypto.randomBytes(32).toString("hex");
}