"use client";

import { useState } from "react";

type InvestigateButtonProps = {
  invoiceId: string;
};

export default function InvestigateButton({
  invoiceId,
}: InvestigateButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleInvestigate() {
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/invoices/${invoiceId}/investigate`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error("Unable to investigate invoice.");
      }

      window.location.reload();
    } catch (error) {
      console.error("Invoice investigation failed:", error);
      window.alert("Unable to investigate invoice. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleInvestigate}
      disabled={isLoading}
    >
      {isLoading ? "Investigating..." : "Investigate Invoice"}
    </button>
  );
}