import { NextResponse } from "next/server";

import { investigateInvoice } from "@/app/lib/investigation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;

    const investigation = await investigateInvoice(id);

    return NextResponse.json({
      status: "ok",
      investigation,
    });
  } catch (error) {
    console.error("Invoice investigation failed:", error);

    if (
      error instanceof Error &&
      error.message === "Invoice not found"
    ) {
      return NextResponse.json(
        {
          status: "error",
          message: "Invoice not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        status: "error",
        message: "Unable to investigate invoice.",
      },
      { status: 500 },
    );
  }
}