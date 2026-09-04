import { NextResponse } from "next/server";
import { getRecentIncomingGmailMessages } from "@/app/lib/google/gmail";

export async function GET() {
  try {
    const messages = await getRecentIncomingGmailMessages(
      "seed-demo-organization",
    );

    return NextResponse.json({
      count: messages.length,
      messages,
    });
  } catch (error) {
    console.error("Gmail read test failed:", error);

    return NextResponse.json(
      {
        error: "Failed to read Gmail messages",
      },
      { status: 500 },
    );
  }
}
