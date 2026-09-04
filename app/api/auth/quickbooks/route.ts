import { NextResponse } from "next/server";

import {
  quickBooksOAuthClient,
  quickBooksScopes,
} from "@/app/lib/quickbooks/oauth";

export async function GET() {
  try {
    const authUri = quickBooksOAuthClient.authorizeUri({
      scope: quickBooksScopes,
      state: "seed-demo-organization",
    });

    return NextResponse.redirect(authUri);
  } catch (error) {
    console.error("QuickBooks OAuth start failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Unable to start QuickBooks connection.",
      },
      { status: 500 },
    );
  }
}