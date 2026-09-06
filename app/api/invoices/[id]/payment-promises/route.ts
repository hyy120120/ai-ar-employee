import { NextResponse } from "next/server";
import {
  createPaymentPromise,
  getPaymentPromises,
  updatePaymentPromise,
  cancelPaymentPromise,
} from "@/app/lib/payment-promises";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ORGANIZATION_ID = "seed-demo-organization";

function parseFutureDate(value: unknown): Date {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Invalid promised payment date.");
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid promised payment date.");
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (date < today) {
    throw new Error("Promised payment date cannot be in the past.");
  }

  return date;
}

function parseAmount(value: unknown): number {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a valid promised amount.");
  }

  return amount;
}

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;

    const promises = await getPaymentPromises(
      ORGANIZATION_ID,
      id,
    );

    return NextResponse.json({
      status: "ok",
      promises,
    });
  } catch (error) {
    console.error("Payment promises fetch failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Unable to load payment promises.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const promisedAmount = parseAmount(body.promisedAmount);
    const promisedDate = parseFutureDate(body.promisedDate);

    const promise = await createPaymentPromise({
      organizationId: ORGANIZATION_ID,
      invoiceId: id,
      promisedAmount,
      promisedDate,
      source: body.source ?? "MANUAL",
      confidence:
        body.confidence === undefined
          ? undefined
          : Number(body.confidence),
      note:
        typeof body.note === "string"
          ? body.note.trim()
          : undefined,
    });

    return NextResponse.json({
      status: "ok",
      promise,
    });
  } catch (error) {
    console.error("Payment promise creation failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to create payment promise.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const promisedAmount = parseAmount(body.promisedAmount);
    const promisedDate = parseFutureDate(body.promisedDate);

    const promise = await updatePaymentPromise({
      organizationId: ORGANIZATION_ID,
      invoiceId: id,
      promiseId: body.promiseId,
      promisedAmount,
      promisedDate,
      note:
        typeof body.note === "string"
          ? body.note.trim()
          : undefined,
    });

    return NextResponse.json({
      status: "ok",
      promise,
    });
  } catch (error) {
    console.error("Payment promise update failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to update payment promise.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const promise = await cancelPaymentPromise({
      organizationId: ORGANIZATION_ID,
      invoiceId: id,
      promiseId: body.promiseId,
    });

    return NextResponse.json({
      status: "ok",
      promise,
    });
  } catch (error) {
    console.error("Payment promise cancellation failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to cancel payment promise.",
      },
      { status: 400 },
    );
  }
}