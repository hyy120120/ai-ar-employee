import { prisma } from "@/app/lib/prisma";
import type {
  PaymentPromiseSource,
  PaymentPromiseStatus,
} from "@/app/generated/prisma/client";

type CreatePaymentPromiseInput = {
  organizationId: string;
  invoiceId: string;
  promisedAmount: number;
  promisedDate: Date;
  source: PaymentPromiseSource;
  confidence?: number;
  note?: string;
};

type UpdatePaymentPromiseInput = {
  organizationId: string;
  invoiceId: string;
  promiseId: string;
  promisedAmount: number;
  promisedDate: Date;
  note?: string;
};

type CancelPaymentPromiseInput = {
  organizationId: string;
  invoiceId: string;
  promiseId: string;
};

export async function createPaymentPromise(
  input: CreatePaymentPromiseInput,
) {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: input.invoiceId,
      organizationId: input.organizationId,
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  const balanceDue = Number(invoice.balanceDue);

  if (input.promisedAmount > balanceDue) {
    throw new Error(
      "Promised amount cannot exceed the current balance.",
    );
  }

  if (input.promisedDate.getTime() < Date.now()) {
    throw new Error(
      "Promised payment date cannot be in the past.",
    );
  }

  const activePromise = await prisma.paymentPromise.findFirst({
    where: {
      organizationId: input.organizationId,
      invoiceId: input.invoiceId,
      status: {
        in: ["PROMISED", "PARTIAL"],
      },
    },
  });

  if (activePromise) {
    throw new Error(
      "This invoice already has an active payment promise.",
    );
  }

  return prisma.paymentPromise.create({
    data: {
      organizationId: input.organizationId,
      invoiceId: input.invoiceId,
      promisedAmount: input.promisedAmount,
      promisedDate: input.promisedDate,
      status: "PROMISED",
      source: input.source,
      confidence: input.confidence,
      note: input.note,
    },
  });
}

export async function getPaymentPromises(
  organizationId: string,
  invoiceId: string,
) {
  return prisma.paymentPromise.findMany({
    where: {
      organizationId,
      invoiceId,
    },
    orderBy: {
      promisedDate: "asc",
    },
  });
}

export async function updatePaymentPromise(
  input: UpdatePaymentPromiseInput,
) {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: input.invoiceId,
      organizationId: input.organizationId,
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  const promise = await prisma.paymentPromise.findFirst({
    where: {
      id: input.promiseId,
      organizationId: input.organizationId,
      invoiceId: input.invoiceId,
    },
  });

  if (!promise) {
    throw new Error("Payment promise not found.");
  }

  if (
    promise.status !== "PROMISED" &&
    promise.status !== "PARTIAL"
  ) {
    throw new Error(
      "Only active payment promises can be edited.",
    );
  }

  const balanceDue = Number(invoice.balanceDue);

  if (input.promisedAmount > balanceDue) {
    throw new Error(
      "Promised amount cannot exceed the current balance.",
    );
  }

  if (input.promisedDate.getTime() < Date.now()) {
    throw new Error(
      "Promised payment date cannot be in the past.",
    );
  }

  return prisma.paymentPromise.update({
    where: {
      id: promise.id,
    },
    data: {
      promisedAmount: input.promisedAmount,
      promisedDate: input.promisedDate,
      note: input.note,
    },
  });
}

export async function cancelPaymentPromise(
  input: CancelPaymentPromiseInput,
) {
  const promise = await prisma.paymentPromise.findFirst({
    where: {
      id: input.promiseId,
      organizationId: input.organizationId,
      invoiceId: input.invoiceId,
    },
  });

  if (!promise) {
    throw new Error("Payment promise not found.");
  }

  if (
    promise.status !== "PROMISED" &&
    promise.status !== "PARTIAL"
  ) {
    throw new Error(
      "Only active payment promises can be cancelled.",
    );
  }

  return prisma.paymentPromise.update({
    where: {
      id: promise.id,
    },
    data: {
      status: "CANCELLED",
    },
  });
}

export async function monitorPaymentPromises(
  organizationId: string,
) {
  const promises = await prisma.paymentPromise.findMany({
    where: {
      organizationId,
      status: {
        in: ["PROMISED", "PARTIAL"],
      },
      promisedDate: {
        lt: new Date(),
      },
    },
    include: {
      invoice: true,
    },
  });

  return promises.map((promise) => ({
    id: promise.id,
    invoiceId: promise.invoiceId,
    promisedAmount: Number(promise.promisedAmount),
    promisedDate: promise.promisedDate,
    status: promise.status,
    balanceDue: Number(promise.invoice.balanceDue),
  }));
}