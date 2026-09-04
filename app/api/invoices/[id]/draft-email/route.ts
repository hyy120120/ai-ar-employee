import { NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";
import { draftCollectionEmail } from "@/app/lib/ai/draft-collection-email";

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

    const invoice = await prisma.invoice.findUnique({
      where: {
        id,
      },
      include: {
        customer: true,
        organization: true,
        investigations: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        {
          status: "error",
          message: "Invoice not found.",
        },
        { status: 404 },
      );
    }

    const investigation = invoice.investigations[0];

    if (!investigation) {
      return NextResponse.json(
        {
          status: "error",
          message: "Invoice has not been investigated yet.",
        },
        { status: 400 },
      );
    }

    if (!invoice.customer.email) {
      return NextResponse.json(
        {
          status: "error",
          message: "Customer email is not available.",
        },
        { status: 400 },
      );
    }

    const draft = await draftCollectionEmail({
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        balanceDue: Number(invoice.balanceDue),
        dueDate: invoice.dueDate.toISOString(),
      },
      customer: {
          name: invoice.customer.name,
          email: invoice.customer.email,
        },
        company: {
          name: invoice.organization.name,
        phone: invoice.organization.phone,
        },
        investigation: {
        finding: investigation.finding,
        recommendedAction: investigation.recommendedAction,
        riskLevel: investigation.riskLevel,
      },
    });

    return NextResponse.json({
      status: "ok",
      draft,
    });
  } catch (error) {
    console.error("Collection email draft failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Unable to generate collection email draft.",
      },
      { status: 500 },
    );
  }
}