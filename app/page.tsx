import { getDashboardData } from "@/app/lib/dashboard";
import Link from "next/link";
import { prisma } from "@/app/lib/prisma";
import GmailTestButton from "./gmail-test-button";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getDaysOverdue(dueDate: Date) {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const days = Math.floor(
    (Date.now() - dueDate.getTime()) / millisecondsPerDay,
  );

  return Math.max(days, 0);
}

export default async function Home() {
  const { organization, invoices, pendingActions, metrics } =
    await getDashboardData();

    const googleConnection = await prisma.googleConnection.findUnique({
  where: {
    organizationId: organization.id,
  },
  select: {
    email: true,
  },
});

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">AI AR EMPLOYEE</p>
          <h1>Accounts Receivable</h1>
          <p className="muted">
            {organization.name}
          </p>
        </div>

        {googleConnection ? (
          <div className="connection-status">
            <strong>✓ Gmail Connected</strong>
            <span>{googleConnection.email}</span>
          </div>
        ) : (
          <a href="/api/auth/google" className="primary-button">
            Connect Gmail
          </a>
        )}
        {googleConnection && <GmailTestButton />}
      </header>

      <section className="metrics-grid">
        <div className="metric-card">
          <span>Total outstanding</span>
          <strong>{formatCurrency(metrics.totalOutstanding)}</strong>
        </div>

        <div className="metric-card">
          <span>Overdue</span>
          <strong>{formatCurrency(metrics.totalOverdue)}</strong>
        </div>

        <div className="metric-card">
          <span>Collected</span>
          <strong>{formatCurrency(metrics.totalCollected)}</strong>
        </div>

        <div className="metric-card">
          <span>AI actions</span>
          <strong>{metrics.pendingActions}</strong>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-header">
          <div>
            <h2>Invoice queue</h2>
            <p className="muted">
              Invoices requiring attention
            </p>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Invoice</th>
                <th>Amount due</th>
                <th>Due date</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {invoices.map((invoice) => {
                const daysOverdue =
                  Number(invoice.balanceDue) > 0
                    ? getDaysOverdue(invoice.dueDate)
                    : 0;

                return (
                  <tr key={invoice.id}>
                    <td>
                      <strong>{invoice.customer.name}</strong>
                    </td>

                    <td>
                      <Link href={`/invoices/${invoice.id}`}>
                        {invoice.invoiceNumber}
                      </Link>
                    </td>

                    <td>
                      {formatCurrency(Number(invoice.balanceDue))}
                    </td>

                    <td>
                      {invoice.dueDate.toLocaleDateString("en-US")}
                    </td>

                    <td>
                      <span
                        className={`status status-${invoice.status.toLowerCase()}`}
                      >
                        {invoice.status === "OVERDUE"
                          ? `${daysOverdue} days overdue`
                          : invoice.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-header">
          <div>
            <h2>AI actions</h2>
            <p className="muted">
              Actions waiting for review
            </p>
          </div>
        </div>

        <div className="actions-list">
          {pendingActions.map((action) => (
            <div className="action-card" key={action.id}>
              <div>
                <strong>
                  {action.type.replace("_", " ")}
                </strong>

                <p>
                  {action.invoice?.customer.name} ·{" "}
                  {action.invoice?.invoiceNumber}
                </p>

                <span className="muted">
                  {action.reason}
                </span>
              </div>

              <span
                className={`risk risk-${action.riskLevel.toLowerCase()}`}
              >
                {action.riskLevel}
              </span>
            </div>
          ))}

          {pendingActions.length === 0 && (
            <p className="muted">No pending AI actions.</p>
          )}
        </div>
      </section>
    </main>
  );
}