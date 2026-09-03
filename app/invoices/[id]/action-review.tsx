"use client";

import { useState } from "react";

type ActionReviewProps = {
  actionId: string;
  type: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  reason: string | null;
  recommendation: string | null;
};

export default function ActionReview({
  actionId,
  type,
  riskLevel,
  reason,
  recommendation,
}: ActionReviewProps) {
  const [status, setStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">(
    "PENDING",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai-actions/${actionId}/approve`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to approve action.");
      }

      setStatus("APPROVED");
    } catch (error) {
      console.error("AI action approval failed:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to approve action.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReject() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai-actions/${actionId}/reject`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to reject action.");
      }

      setStatus("REJECTED");
    } catch (error) {
      console.error("AI action rejection failed:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to reject action.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (status === "APPROVED") {
    return (
      <section className="action-review-card">
        <div className="action-review-success">
          <span className="action-review-status">APPROVED</span>
          <h3>Action approved</h3>
          <p>
            This AI action has been approved for the next execution step.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="action-review-card">
      <div className="action-review-header">
        <div>
          <p className="eyebrow">AI ACTION REVIEW</p>
          <h2>{type.replaceAll("_", " ")}</h2>
        </div>

        <span className={`risk-badge risk-${riskLevel.toLowerCase()}`}>
          {riskLevel} RISK
        </span>
      </div>

      <div className="action-review-content">
        <div className="action-review-field">
          <span>Why</span>
          <p>{reason ?? "No reason provided."}</p>
        </div>

        <div className="action-review-field">
          <span>Recommended action</span>
          <p>{recommendation ?? "No recommendation provided."}</p>
        </div>
      </div>

      {error && (
        <div className="action-review-error">
          {error}
        </div>
      )}

      {riskLevel === "HIGH" ? (
        <div className="action-review-warning">
          High-risk actions require manual handling and cannot be approved
          automatically.
        </div>
      ) : (
        <div className="action-review-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={handleReject}
            disabled={isLoading}
          >
            Reject
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={handleApprove}
            disabled={isLoading}
          >
            {isLoading ? "Approving..." : "Approve"}
          </button>
        </div>
      )}

      {status === "REJECTED" && (
        <div className="action-review-rejected">
          Action rejected. No email will be sent.
        </div>
      )}
    </section>
  );
}