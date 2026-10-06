import { useEffect, useMemo, useState } from "react";
import PatientSidebar from "../../components/PatientSidebar.jsx";
import { api } from "../../lib/api";
import { useAuthGuard } from "../../lib/useAuthGuard";
import { useMyPatient } from "../../lib/useMyPatient";
import { currentDateLong, formatDate } from "../../lib/ui";
import TopbarActions from "../../components/TopbarActions.jsx";

const FILTERS = ["all", "Paid", "Unpaid", "Partial"];

export default function PatientBillingPage() {
  const { ready } = useAuthGuard("PATIENT");
  const { patient, loading: patientLoading } = useMyPatient();
  const [bills, setBills] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!ready || patientLoading || !patient) return;
    api
      .getInvoices()
      .then((res) => {
        const mine = (res || [])
          .filter((b) => b.patientId === patient.id)
          .sort((a, b) => new Date(b.billingDate) - new Date(a.billingDate));
        setBills(mine);
      })
      .catch(() => {});
  }, [ready, patientLoading, patient]);

  const totals = useMemo(() => {
    let totalBilled = 0;
    let totalPaid = 0;
    bills.forEach((b) => {
      totalBilled += b.totalAmount || 0;
      totalPaid += b.paidAmount || 0;
    });
    return { totalBilled, totalPaid, totalDue: totalBilled - totalPaid };
  }, [bills]);

  const filtered = filter === "all" ? bills : bills.filter((b) => b.paymentStatus === filter);

  if (!ready) return null;

  return (
    <>
      <PatientSidebar active="billing" patient={patient} />

      <div className="main">
        <div className="topbar">
          <div className="page-title">Billing &amp; Invoices</div>
          <div className="topbar-right">
            <TopbarActions />
            <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--muted)" }}>{currentDateLong()}</span>
          </div>
        </div>

        <div className="content" style={{ padding: "32px" }}>
          <div className="billing-summary">
            <div className="billing-card total">
              <div className="billing-card-icon">
                <span className="material-symbols-outlined" style={{ color: "var(--teal)", fontSize: "28px" }}>
                  account_balance_wallet
                </span>
              </div>
              <div className="billing-card-amount">৳{totals.totalBilled.toLocaleString()}</div>
              <div className="billing-card-label">Total Billed</div>
            </div>
            <div className="billing-card paid">
              <div className="billing-card-icon">
                <span className="material-symbols-outlined" style={{ color: "var(--success)", fontSize: "28px" }}>
                  check_circle
                </span>
              </div>
              <div className="billing-card-amount">৳{totals.totalPaid.toLocaleString()}</div>
              <div className="billing-card-label">Total Paid</div>
            </div>
            <div className="billing-card due">
              <div className="billing-card-icon">
                <span className="material-symbols-outlined" style={{ color: "var(--danger)", fontSize: "28px" }}>
                  warning
                </span>
              </div>
              <div className="billing-card-amount">৳{totals.totalDue.toLocaleString()}</div>
              <div className="billing-card-label">Amount Due</div>
            </div>
            <div className="billing-card partial">
              <div className="billing-card-icon">
                <span className="material-symbols-outlined" style={{ color: "#7c5cbf", fontSize: "28px" }}>
                  description
                </span>
              </div>
              <div className="billing-card-amount">{bills.length}</div>
              <div className="billing-card-label">Total Invoices</div>
            </div>
          </div>

          <div className="invoice-table-wrap">
            <div className="invoice-header">
              <div className="invoice-title">Invoice History</div>
              <div className="filter-pills">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    className={"filter-pill" + (filter === f ? " active" : "")}
                    onClick={() => setFilter(f)}
                  >
                    {f === "all" ? "All" : f}
                  </button>
                ))}
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Method</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="7">
                      <div className="empty-state">
                        <div className="empty-state-icon">
                          <span className="material-symbols-outlined" style={{ fontSize: "48px" }}>
                            receipt_long
                          </span>
                        </div>
                        <div className="empty-state-title">No invoices found</div>
                      </div>
                    </td>
                  </tr>
                )}
                {filtered.map((b) => {
                  const statusClass = (b.paymentStatus || "unpaid").toLowerCase();
                  const itemCount = (b.items && b.items.length) || "—";
                  return (
                    <tr key={b.id}>
                      <td>
                        <span className="invoice-code">{b.invoiceCode}</span>
                      </td>
                      <td>{formatDate(b.billingDate)}</td>
                      <td>
                        {itemCount} item{itemCount !== 1 ? "s" : ""}
                      </td>
                      <td>
                        <strong>৳{(b.totalAmount || 0).toLocaleString()}</strong>
                      </td>
                      <td>৳{(b.paidAmount || 0).toLocaleString()}</td>
                      <td>{b.paymentMethod || "—"}</td>
                      <td>
                        <span className={"badge " + statusClass}>{b.paymentStatus}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
