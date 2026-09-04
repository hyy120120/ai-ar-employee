import { NextResponse } from "next/server";

import { getQuickBooksClient } from "@/app/lib/quickbooks/client";

export async function GET() {
  try {
    const { client, realmId } = await getQuickBooksClient();

    const response = await client.makeApiCall({
      url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=${encodeURIComponent(
        "SELECT * FROM Invoice MAXRESULTS 20",
      )}&minorversion=75`,
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const data = response.json;

    return NextResponse.json({
      status: "ok",
      invoices: data.QueryResponse?.Invoice ?? [],
    });
  } catch (error) {
    console.error("QuickBooks invoice fetch failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to fetch QuickBooks invoices.",
      },
      { status: 500 },
    );
  }
}