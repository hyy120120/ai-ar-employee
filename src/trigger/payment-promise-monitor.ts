import { logger, schedules } from "@trigger.dev/sdk";
import { monitorPaymentPromises } from "@/app/lib/payment-promises";

export const paymentPromiseMonitor = schedules.task({
  id: "payment-promise-monitor",
  cron: "30 9 * * *",
  maxDuration: 300,

  run: async () => {
    const result = await monitorPaymentPromises(
      "seed-demo-organization",
    );

    logger.log("Payment promise monitor completed", {
     resultCount: result.length,
     result,
    });

    return result;
  },
});