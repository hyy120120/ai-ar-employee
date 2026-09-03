"use client";

import { useState } from "react";

type EmailDraftProps = {
  invoiceId: string;
  customerEmail: string;
};

type Draft = {
  subject: string;
  body: string;
};

export default function EmailDraft({
  invoiceId,
  customerEmail,
}: EmailDraftProps) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerateDraft() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/invoices/${invoiceId}/draft-email`,
        {
          method: "POST",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ?? "Unable to generate email draft.",
        );
      }

      setDraft(data.draft);
    } catch (error) {
      console.error("Email draft generation failed:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to generate email draft.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="email-draft-card">
      <div className="email-draft-header">
        <div>
          <p className="eyebrow">AI COLLECTION DRAFT</p>
          <h2>Customer follow-up</h2>
        </div>

        {!draft && (
          <button
            type="button"
            onClick={handleGenerateDraft}
            disabled={isLoading}
            className="email-draft-generate-button"
          >
            {isLoading ? "Drafting..." : "Generate draft"}
          </button>
        )}
      </div>

      {error && (
        <div className="email-draft-error">
          {error}
        </div>
      )}

      {draft && (
        <div className="email-draft-content">
          <div className="email-field">
            <span>To</span>
            <strong>{customerEmail}</strong>
          </div>

          <div className="email-field">
            <span>Subject</span>
            <strong>{draft.subject}</strong>
          </div>

          <div className="email-body">
            {draft.body.split("\n").map((paragraph, index) => (
              <p key={`${paragraph}-${index}`}>
                {paragraph || "\u00A0"}
              </p>
            ))}
          </div>

          <div className="email-draft-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={handleGenerateDraft}
              disabled={isLoading}
            >
              {isLoading ? "Regenerating..." : "Regenerate"}
            </button>

            <button
              type="button"
              className="primary-button"
              disabled
              title="Email sending will be enabled after Gmail integration."
            >
              Approve & Send
            </button>
          </div>

          <p className="email-draft-note">
            Review the AI-generated message before sending.
          </p>
        </div>
      )}

      {!draft && !error && (
        <div className="email-draft-empty">
          <p>
            Generate a professional follow-up based on the
            invoice investigation.
          </p>
        </div>
      )}
    </section>
  );
}