"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./PaymentPromiseSection.module.css";

type PaymentPromise = {
  id: string;
  promisedAmount: string | number;
  promisedDate: string | Date;
  status:
    | "PROMISED"
    | "PARTIAL"
    | "FULFILLED"
    | "BROKEN"
    | "CANCELLED";
  source: "MANUAL" | "EMAIL" | "AI";
  note: string | null;
};

type Props = {
  invoiceId: string;
  balanceDue: number;
  promises: PaymentPromise[];
};

function toDateInputValue(value: string | Date) {
  const date = new Date(value);

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function PaymentPromiseSection({
  invoiceId,
  balanceDue,
  promises,
}: Props) {
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [editingPromiseId, setEditingPromiseId] =
    useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [cancellingId, setCancellingId] =
    useState<string | null>(null);

  const [error, setError] = useState("");

  const activePromise = promises.find(
    (promise) =>
      promise.status === "PROMISED" ||
      promise.status === "PARTIAL",
  );

  const today = new Date().toISOString().split("T")[0];

  function resetForm() {
    setAmount("");
    setDate("");
    setNote("");
    setEditingPromiseId(null);
    setShowForm(false);
    setError("");
  }

  function handleEdit(promise: PaymentPromise) {
    setEditingPromiseId(promise.id);
    setAmount(Number(promise.promisedAmount).toFixed(2));
    setDate(toDateInputValue(promise.promisedDate));
    setNote(promise.note ?? "");
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    const promisedAmount = Number(amount);

    if (
      !Number.isFinite(promisedAmount) ||
      promisedAmount <= 0
    ) {
      setError("Enter a valid promised amount.");
      return;
    }

    if (promisedAmount > balanceDue) {
      setError(
        "Promised amount cannot exceed the current balance.",
      );
      return;
    }

    if (!date) {
      setError("Select a promised payment date.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/invoices/${invoiceId}/payment-promises`,
        {
          method: editingPromiseId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            editingPromiseId
              ? {
                  promiseId: editingPromiseId,
                  promisedAmount,
                  promisedDate: date,
                  note: note.trim() || undefined,
                }
              : {
                  promisedAmount,
                  promisedDate: date,
                  source: "MANUAL",
                  note: note.trim() || undefined,
                },
          ),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            (editingPromiseId
              ? "Unable to update payment promise."
              : "Unable to create payment promise."),
        );
      }

      resetForm();
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to save payment promise.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(promiseId: string) {
    const confirmed = window.confirm(
      "Cancel this payment promise? The promise will remain in history.",
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setCancellingId(promiseId);

    try {
      const response = await fetch(
        `/api/invoices/${invoiceId}/payment-promises`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            promiseId,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Unable to cancel payment promise.",
        );
      }

      if (editingPromiseId === promiseId) {
        resetForm();
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to cancel payment promise.",
      );
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <div>
          <h2>Payment promises</h2>
          <p className="muted">
            Track customer payment commitments for this invoice.
          </p>
        </div>

        {!activePromise && (
          <button
            type="button"
            className="button"
            onClick={() => {
              setError("");
              setShowForm((value) => !value);
            }}
          >
            + Add payment promise
          </button>
        )}
      </div>

      {showForm && (
        <form
          className={styles.form}
          onSubmit={handleSubmit}
        >
          <div className={styles.field}>
            <label
              htmlFor="promise-amount"
              className={styles.label}
            >
              Promised amount
            </label>

            <input
              id="promise-amount"
              className={styles.input}
              type="number"
              min="0.01"
              max={balanceDue}
              step="0.01"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value)
              }
              placeholder="2500.00"
              disabled={saving}
            />
          </div>

          <div className={styles.field}>
            <label
              htmlFor="promise-date"
              className={styles.label}
            >
              Promised payment date
            </label>

            <input
              id="promise-date"
              className={styles.input}
              type="date"
              min={today}
              value={date}
              onChange={(event) =>
                setDate(event.target.value)
              }
              disabled={saving}
            />
          </div>

          <div className={styles.field}>
            <label
              htmlFor="promise-note"
              className={styles.label}
            >
              Note
            </label>

            <textarea
              id="promise-note"
              className={styles.textarea}
              value={note}
              onChange={(event) =>
                setNote(event.target.value)
              }
              placeholder="Customer confirmed payment after PO approval."
              rows={3}
              disabled={saving}
            />
          </div>

          {error && (
            <p className={styles.error}>
              {error}
            </p>
          )}

          <div className={styles.formActions}>
            <button
              type="button"
              className="button secondary"
              onClick={resetForm}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="button"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingPromiseId
                  ? "Update promise"
                  : "Save promise"}
            </button>
          </div>
        </form>
      )}

      {error && !showForm && (
        <p className={styles.error}>{error}</p>
      )}

      {promises.length === 0 && !showForm && (
        <p className="muted">
          No payment promises recorded for this invoice.
        </p>
      )}

      <div className="actions-list">
        {promises.map((promise) => {
          const promisedDate = new Date(
            promise.promisedDate,
          );

          const isActive =
            promise.status === "PROMISED" ||
            promise.status === "PARTIAL";

          return (
            <div
              className="action-card"
              key={promise.id}
            >
              <div className={styles.promiseCard}>
                <div className={styles.promiseDetails}>
                  <strong className={styles.promiseAmount}>
                    ${Number(promise.promisedAmount).toFixed(2)}
                  </strong>

                  <p className={styles.promiseDate}>
                    Promised:{" "}
                    {promisedDate.toLocaleDateString(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                  </p>

                  {promise.note && (
                    <p className={styles.promiseNote}>
                      {promise.note}
                    </p>
                  )}

                  <span className={styles.promiseSource}>
                    Source: {promise.source}
                  </span>

                  {isActive && (
                    <div className={styles.promiseActions}>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() =>
                          handleEdit(promise)
                        }
                        disabled={
                          cancellingId === promise.id
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="button secondary"
                        onClick={() =>
                          handleCancel(promise.id)
                        }
                        disabled={
                          cancellingId === promise.id
                        }
                      >
                        {cancellingId === promise.id
                          ? "Cancelling..."
                          : "Cancel promise"}
                      </button>
                    </div>
                  )}
                </div>

                <span
                  className={`status ${
                    promise.status === "FULFILLED"
                      ? "status-paid"
                      : promise.status === "BROKEN"
                        ? "status-overdue"
                        : "status-pending"
                  }`}
                >
                  {promise.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}