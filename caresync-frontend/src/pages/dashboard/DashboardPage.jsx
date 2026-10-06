import { useEffect, useRef, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar.jsx";
import { api } from "../../lib/api";
import { useAuthGuard } from "../../lib/useAuthGuard";
import { loadExternalScript } from "../../lib/ui";
import TopbarActions from "../../components/TopbarActions.jsx";

const WEEKLY = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  admissions: [12, 19, 15, 8, 22, 14, 18],
  emergency: [5, 3, 8, 4, 12, 7, 9],
};
const MONTHLY = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  admissions: [120, 150, 180, 240, 190, 210],
  emergency: [45, 60, 52, 89, 73, 82],
};

export default function DashboardPage() {
  const { ready } = useAuthGuard();
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState("weekly");

  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!ready) return;
    api.getDashboardStats().then(setStats).catch(() => {});
  }, [ready]);

  // Chart.js — create once, then update in place when the period changes
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    loadExternalScript("https://cdn.jsdelivr.net/npm/chart.js").then(() => {
      if (cancelled || !canvasRef.current || !window.Chart) return;
      const ds = period === "weekly" ? WEEKLY : MONTHLY;
      chartRef.current = new window.Chart(canvasRef.current.getContext("2d"), {
        type: "line",
        data: {
          labels: ds.labels,
          datasets: [
            {
              label: "Admissions",
              data: ds.admissions,
              borderColor: "#0a7c7c",
              backgroundColor: "rgba(10, 124, 124, 0.05)",
              tension: 0.35,
              fill: true,
              borderWidth: 3,
              pointBackgroundColor: "#0a7c7c",
            },
            {
              label: "Emergency Calls",
              data: ds.emergency,
              borderColor: "#e05252",
              backgroundColor: "rgba(224, 82, 82, 0.05)",
              tension: 0.35,
              fill: true,
              borderWidth: 3,
              pointBackgroundColor: "#e05252",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              labels: { font: { family: "'DM Sans', sans-serif", size: 12, weight: "500" }, color: "#1e3448" },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: "#dde8ed" },
              ticks: { font: { family: "'DM Sans', sans-serif", size: 11 }, color: "#6b8fa3" },
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: "'DM Sans', sans-serif", size: 11 }, color: "#6b8fa3" },
            },
          },
        },
      });
    });

    return () => {
      cancelled = true;
      chartRef.current?.destroy();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Swap dataset in place when period toggles (no full chart re-create, matches original UX)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const ds = period === "weekly" ? WEEKLY : MONTHLY;
    chart.data.labels = ds.labels;
    chart.data.datasets[0].data = ds.admissions;
    chart.data.datasets[1].data = ds.emergency;
    chart.update();
  }, [period]);

  if (!ready) return null;

  return (
    <>
      <AdminSidebar active="dashboard" />

      <div className="main">
        <div className="topbar">
          <div className="page-title">Hospital Overview</div>
          <div className="topbar-right">
            <div className="search-box">
              <span
                className="material-symbols-outlined search-icon"
                style={{
                  fontSize: "16px",
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--muted)",
                }}
              >
                search
              </span>
              <input type="text" placeholder="Search patients, doctors..." />
            </div>
            <TopbarActions />
          </div>
        </div>

        <div className="content">
          <div className="stat-grid">
            <div className="card stat-card">
              <div className="stat-label">Total Patients</div>
              <div className="stat-number">
                {stats ? stats.totalPatients ?? 0 : "—"} <span className="trend up">live</span>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Available Beds</div>
              <div className="stat-number">
                {stats ? `${stats.availableBeds ?? 0} / ${stats.totalBeds ?? 0}` : "—"}{" "}
                <span className="trend down">beds</span>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Active Doctors</div>
              <div className="stat-number">
                {stats ? stats.activeDoctors ?? 0 : "—"} <span className="trend up">doctors</span>
              </div>
            </div>
            <div className="card stat-card" style={{ borderTop: "4px solid var(--danger)" }}>
              <div
                className="stat-label"
                style={{ color: "var(--danger)", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                  emergency
                </span>{" "}
                Active Emergency
              </div>
              <div className="stat-number" style={{ color: "#7a0000" }}>
                {stats ? stats.activeEmergencyCases ?? 0 : "—"}
                <span style={{ fontSize: "12px", color: "var(--danger)", fontWeight: "600" }}>
                  {stats ? ` (${stats.criticalCases ?? 0} Critical)` : ""}
                </span>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: "32px" }}>
            <div
              className="card-header"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}
            >
              <div
                className="card-title"
                style={{ fontFamily: '"Sora", sans-serif', fontSize: "15px", fontWeight: "700", color: "var(--navy)" }}
              >
                Hospital Admissions &amp; Emergency Activity
              </div>
              <select
                className="filter-select"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={{
                  padding: "6px 12px",
                  fontFamily: "inherit",
                  fontSize: "12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  outline: "none",
                  cursor: "pointer",
                  color: "var(--slate)",
                  background: "var(--white)",
                }}
              >
                <option value="weekly">Weekly View</option>
                <option value="monthly">Monthly View</option>
              </select>
            </div>
            <div style={{ position: "relative", height: "320px", width: "100%" }}>
              <canvas ref={canvasRef}></canvas>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="card">
              <div className="card-header">
                <div className="card-title">Recent Patient Admissions</div>
                <a href="/patient-management.html" className="card-btn">
                  View All
                </a>
              </div>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Age/Gender</th>
                      <th>Department</th>
                      <th>Doctor</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div className="p-profile">
                          <div className="p-avatar">AA</div>
                          <div>
                            <div className="p-name">Arif Ahmed</div>
                            <div className="p-id">PT-9941</div>
                          </div>
                        </div>
                      </td>
                      <td>45 / Male</td>
                      <td>Cardiology</td>
                      <td>Dr. Hasan</td>
                      <td>
                        <span className="status-badge sb-success">Admitted</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="p-profile">
                          <div className="p-avatar">NS</div>
                          <div>
                            <div className="p-name">Nusrat Jahan</div>
                            <div className="p-id">PT-9942</div>
                          </div>
                        </div>
                      </td>
                      <td>29 / Female</td>
                      <td>Gynecology</td>
                      <td>Dr. Nasrin</td>
                      <td>
                        <span className="status-badge sb-warning">Observation</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="p-profile">
                          <div className="p-avatar">MK</div>
                          <div>
                            <div className="p-name">Mizanur Rahman</div>
                            <div className="p-id">PT-9943</div>
                          </div>
                        </div>
                      </td>
                      <td>62 / Male</td>
                      <td>Neurology</td>
                      <td>Dr. Kabir</td>
                      <td>
                        <span className="status-badge sb-danger">ICU</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Quick Actions</div>
                </div>
                <div className="qa-grid">
                  <a href="/patient-management.html" className="qa-btn">
                    <span
                      className="material-symbols-outlined qa-icon"
                      style={{ fontSize: "18px", color: "var(--teal)", marginRight: "8px", verticalAlign: "middle" }}
                    >
                      groups
                    </span>
                    Admit Patient
                  </a>
                  <a href="/appointment-system.html" className="qa-btn">
                    <span
                      className="material-symbols-outlined qa-icon"
                      style={{ fontSize: "18px", color: "var(--teal)", marginRight: "8px", verticalAlign: "middle" }}
                    >
                      calendar_today
                    </span>
                    Book Appt.
                  </a>
                  <a href="/billing-system.html" className="qa-btn">
                    <span
                      className="material-symbols-outlined qa-icon"
                      style={{ fontSize: "18px", color: "var(--teal)", marginRight: "8px", verticalAlign: "middle" }}
                    >
                      receipt_long
                    </span>
                    New Invoice
                  </a>
                  <a href="/doctor-management.html" className="qa-btn">
                    <span
                      className="material-symbols-outlined qa-icon"
                      style={{ fontSize: "18px", color: "var(--teal)", marginRight: "8px", verticalAlign: "middle" }}
                    >
                      medical_services
                    </span>
                    Add Doctor
                  </a>
                  <a
                    href="/emergency.html"
                    className="qa-btn"
                    style={{ gridColumn: "1 / -1", borderLeft: "3px solid var(--danger)", background: "#fff5f5" }}
                  >
                    <span
                      className="material-symbols-outlined qa-icon"
                      style={{ fontSize: "18px", color: "var(--danger)", marginRight: "8px", verticalAlign: "middle" }}
                    >
                      emergency
                    </span>
                    New Emergency Case
                  </a>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-title">System Alerts</div>
                </div>
                <div className="alert-list">
                  <div className="alert-item">
                    <div className="alert-dot" style={{ background: "var(--danger)" }}></div>
                    <div>
                      <div className="alert-text">
                        <strong>Emergency Ward:</strong> Ward at 97% capacity (2 Critical Patients)
                      </div>
                      <div className="alert-time">Just now</div>
                    </div>
                  </div>
                  <div className="alert-item">
                    <div className="alert-dot" style={{ background: "var(--warning)" }}></div>
                    <div>
                      <div className="alert-text">3 invoices pending approval</div>
                      <div className="alert-time">15 min ago</div>
                    </div>
                  </div>
                  <div className="alert-item">
                    <div className="alert-dot" style={{ background: "var(--success)" }}></div>
                    <div>
                      <div className="alert-text">Dr. Nasrin scheduled for today</div>
                      <div className="alert-time">1 hr ago</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
