"use client";

import { useState } from "react";

export default function GmailTestButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleTestEmail() {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/google/test-email", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Failed to send test email.",
        );
      }

      setMessage(data.message);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send test email.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="secondary-button"
        onClick={handleTestEmail}
        disabled={loading}
      >
        {loading ? "Sending test email..." : "Send test email"}
      </button>

      {message && (
        <p className="success-message">{message}</p>
      )}

      {error && (
        <p className="error-message">{error}</p>
      )}
    </div>
  );
}