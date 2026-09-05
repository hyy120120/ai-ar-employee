import { logger, schedules } from "@trigger.dev/sdk";
import { prisma } from "@/app/lib/prisma";
import { investigateInvoice } from "@/app/lib/investigation";
import { createAIAction } from "@/app/lib/actions";

export const overdueInvoiceScanner = schedules.task({
  id: "overdue-invoice-scanner",
  cron: "0 9 * * *",
  maxDuration: 300,

  run: async () => {
    const now = new Date();

    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        organizationId: "seed-demo-organization",
        balanceDue: { gt: 0 },
        dueDate: { lt: now },
      },
      include: {
        customer: true,
      },
    });

    let investigationsRun = 0;
    let actionsCreated = 0;
    let actionsSkipped = 0;

    for (const invoice of overdueInvoices) {
      const existingActiveAction = await prisma.aIAction.findFirst({
        where: {
          organizationId: invoice.organizationId,
          invoiceId: invoice.id,
          status: {
            in: ["PENDING", "APPROVED"],
          },
        },
      });

      if (existingActiveAction) {
        actionsSkipped++;
        continue;
      }

      const investigation = await investigateInvoice(invoice.id);

      investigationsRun++;

      if (!investigation.actionType) {
        continue;
      }

      const result = await createAIAction({
        organizationId: invoice.organizationId,
        invoiceId: invoice.id,
        type: investigation.actionType,
        riskLevel: investigation.riskLevel,
        reason: investigation.finding,
        recommendation: investigation.recommendedAction,
      });

      if (result.created) {
          actionsCreated++;
        } else {
          actionsSkipped++;
        }
    }

    logger.log("Overdue invoice scan completed", {
      overdueInvoices: overdueInvoices.length,
      investigationsRun,
      actionsCreated,
      actionsSkipped,
    });

    return {
      overdueInvoices: overdueInvoices.length,
      investigationsRun,
      actionsCreated,
      actionsSkipped,
    };
  },
});