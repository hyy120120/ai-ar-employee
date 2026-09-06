import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/app/lib/prisma";
import InvestigateButton from "./investigate-button";
import EmailDraft from "./email-draft";
import ActionReview from "./action-review";
import PaymentPromiseSection from "@/app/components/PaymentPromiseSection";

type InvoicePageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getDaysOverdue(dueDate: Date) {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return Math.max(
    0,
    Math.floor(
      (Date.now() - dueDate.getTime()) / millisecondsPerDay,
    ),
  );
}

export default async function InvoicePage({
  params,
}: InvoicePageProps) {
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: {
      id,
    },
    include: {
       customer: true,
     
       payments: {
         orderBy: {
           paidAt: "desc",
         },
       },
     
       actions: {
         orderBy: {
           createdAt: "desc",
         },
       },
     
       investigations: {
         orderBy: {
           createdAt: "desc",
         },
       },
     
       paymentPromises: {
         orderBy: {
           promisedDate: "asc",
         },
       },
     },
  });

  if (!invoice) {
    notFound();
  }

  const balanceDue = Number(invoice.balanceDue);
  const invoiceAmount = Number(invoice.amount);
  const paidAmount = invoiceAmount - balanceDue;
  const daysOverdue =
    balanceDue > 0 ? getDaysOverdue(invoice.dueDate) : 0;

  const latestInvestigation = invoice.investigations[0];
  const pendingAction = invoice.actions.find(
  (action) => action.status === "PENDING",
);

const emailAction =
  pendingAction ??
  invoice.actions.find(
    (action) => action.status === "APPROVED",
  );

  return (
    <main className="invoice-page">
      <header className="invoice-header">
        <Link href="/" className="back-link">
          ← Back to AR dashboard
        </Link>

        <div className="invoice-title-row">
          <div>
            <p className="eyebrow">INVOICE INVESTIGATION</p>
            <h1>{invoice.invoiceNumber}</h1>
            <p className="muted">{invoice.customer.name}</p>
          </div>

          <span
            className={`status status-${invoice.status.toLowerCase()}`}
          >
            {invoice.status.replace("_", " ")}
          </span>
        </div>
      </header>

      <section className="invoice-grid">
        <div className="invoice-main">
          <section className="investigation-card">
            <div className="card-header">
              <div>
                <p className="eyebrow">AI INVESTIGATION</p>
                <h2>Why is this invoice unpaid?</h2>
              </div>
            </div>

            {latestInvestigation ? (
              <>
                <div className="finding">
                  <span className="finding-label">
                    Current finding
                  </span>

                  <h3>{latestInvestigation.finding}</h3>

                  <p>
                    Confidence:{" "}
                    {Math.round(Number(latestInvestigation.confidence) * 100)}%
                  </p>
                </div>

                <div className="recommendation">
                  <span className="finding-label">
                    Recommended next action
                  </span>

                  <p>{latestInvestigation.recommendedAction}</p>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p>
                  No AI investigation has been created for this
                  invoice yet.
                </p>
              </div>
            )}
          </section>

          <section className="investigation-card">
            <div className="card-header">
              <div>
                <p className="eyebrow">INVOICE FACTS</p>
                <h2>What we know</h2>
              </div>
            </div>

            <div className="facts-grid">
              <div className="fact">
                <span>Invoice amount</span>
                <strong>{formatCurrency(invoiceAmount)}</strong>
              </div>

              <div className="fact">
                <span>Paid</span>
                <strong>{formatCurrency(paidAmount)}</strong>
              </div>

              <div className="fact">
                <span>Balance due</span>
                <strong>{formatCurrency(balanceDue)}</strong>
              </div>

              <div className="fact">
                <span>Due date</span>
                <strong>{formatDate(invoice.dueDate)}</strong>
              </div>

              <div className="fact">
                <span>Days overdue</span>
                <strong>{daysOverdue}</strong>
              </div>

              <div className="fact">
                <span>Customer email</span>
                <strong>
                  {invoice.customer.email ?? "Not available"}
                </strong>
              </div>
            </div>
          </section>

          <section className="investigation-card">
            <div className="card-header">
              <div>
                <p className="eyebrow">PAYMENTS</p>
                <h2>Payment history</h2>
              </div>
            </div>

            {invoice.payments.length > 0 ? (
              <div className="timeline">
                {invoice.payments.map((payment) => (
                  <div className="timeline-item" key={payment.id}>
                    <div>
                      <strong>
                        Payment received
                      </strong>

                      <p className="muted">
                        {formatDate(payment.paidAt)}
                      </p>
                    </div>

                    <strong>
                      {formatCurrency(Number(payment.amount))}
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">
                No payments recorded for this invoice.
              </p>
            )}
          </section>
          <PaymentPromiseSection
            invoiceId={invoice.id}
            promises={invoice.paymentPromises.map((promise) => ({
              ...promise,
              promisedAmount: Number(promise.promisedAmount),
              confidence:
                promise.confidence === null
                  ? null
                  : Number(promise.confidence),
            }))}
            balanceDue={balanceDue}
          />

               {pendingAction && (
            <ActionReview
              actionId={pendingAction.id}
              type={pendingAction.type}
              riskLevel={pendingAction.riskLevel}
              reason={pendingAction.reason}
              recommendation={pendingAction.recommendation}
            />
          )}
        </div>


        <aside className="invoice-sidebar">
          <section className="action-card">
            <p className="eyebrow">NEXT ACTION</p>

            {latestInvestigation ? (
              <>
                <h2>AI recommended action</h2>
            
                <p>{latestInvestigation.recommendedAction}</p>
            
                <p className="muted">
                  Risk: {latestInvestigation.riskLevel}
                </p>
            
                <InvestigateButton invoiceId={invoice.id} />
              </>
            ) : (
              <>
                <h2>No investigation yet</h2>
            
                <p>
                  The AI employee has not investigated this invoice yet.
                </p>
            
                <InvestigateButton invoiceId={invoice.id} />
              </>
            )}
          </section>

          <section className="action-card">
            <p className="eyebrow">CUSTOMER</p>

            <h2>{invoice.customer.name}</h2>

            <p>
              {invoice.customer.email ?? "No email available"}
            </p>
          </section>
        </aside>
      </section>
      
      <EmailDraft
        invoiceId={invoice.id}
        customerEmail={invoice.customer.email ?? ""}
        actionId={emailAction?.id}
      />
    </main>
  );
}