"use client";

import { useState } from "react";

type EmailDraftProps = {
  invoiceId: string;
  customerEmail: string;
  actionId?: string;
};

type Draft = {
  subject: string;
  body: string;
};

export default function EmailDraft({
  invoiceId,
  customerEmail,
  actionId,
}: EmailDraftProps) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleGenerateDraft() {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

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

  async function handleApproveAndSend() {
    if (!draft) {
      return;
    }

    if (!actionId) {
      setError(
        "No AI action is available for this invoice.",
      );
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/ai-actions/${actionId}/execute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject: draft.subject,
            body: draft.body,
            customerEmail,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ?? "Unable to send email.",
        );
      }

      setSuccess(
        `Email sent successfully to ${data.email ?? customerEmail}.`,
      );
    } catch (error) {
      console.error("Email sending failed:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to send email.",
      );
    } finally {
      setIsSending(false);
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

      {success && (
        <div className="email-draft-success">
          {success}
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
              disabled={isLoading || isSending}
            >
              {isLoading ? "Regenerating..." : "Regenerate"}
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={handleApproveAndSend}
              disabled={isSending || !actionId}
            >
              {isSending ? "Sending..." : "Approve & Send"}
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