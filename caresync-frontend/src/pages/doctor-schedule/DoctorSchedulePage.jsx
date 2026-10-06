import { useEffect, useMemo, useState } from "react";
import DoctorSidebar from "../../components/DoctorSidebar.jsx";
import { api } from "../../lib/api";
import { useAuthGuard } from "../../lib/useAuthGuard";
import { useMyDoctor } from "../../lib/useMyDoctor";
import { formatDate, formatTime, currentDateLong, todayISO } from "../../lib/ui";
import TopbarActions from "../../components/TopbarActions.jsx";

export default function DoctorSchedulePage() {
  const { ready } = useAuthGuard("DOCTOR");
  const { doctor, loading: doctorLoading } = useMyDoctor();
  const [appointments, setAppointments] = useState([]);
  const [tab, setTab] = useState("today");

  useEffect(() => {
    if (!ready || doctorLoading || !doctor) return;
    api
      .getAppointments()
      .then((res) => {
        const mine = (res || [])
          .filter((a) => a.doctorId === doctor.id)
          .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));
        setAppointments(mine);
      })
      .catch(() => {});
  }, [ready, doctorLoading, doctor]);

  const buckets = useMemo(() => {
    const today = todayISO();
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    const todayAppts = appointments.filter((a) => a.appointmentDate === today);
    const weekAppts = appointments.filter((a) => a.appointmentDate >= today && a.appointmentDate <= weekEndStr);
    const pending = appointments.filter((a) => a.status === "Pending");
    const confirmed = appointments.filter((a) => a.status === "Confirmed");

    return { todayAppts, weekAppts, pending, confirmed, all: appointments };
  }, [appointments]);

  const visible = tab === "today" ? buckets.todayAppts : tab === "week" ? buckets.weekAppts : buckets.all;

  if (!ready) return null;

  return (
    <>
      <DoctorSidebar active="schedule" doctor={doctor} />

      <div className="main">
        <div className="topbar">
          <div className="page-title">My Schedule</div>
          <div className="topbar-right">
            <TopbarActions />
            <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--muted)" }}>{currentDateLong()}</span>
          </div>
        </div>

        <div className="content" style={{ padding: "32px" }}>
          <div className="schedule-stats">
            <div className="sstat">
              <div className="sstat-icon" style={{ background: "rgba(10, 124, 124, 0.1)" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--teal)", fontSize: "22px" }}>
                  calendar_today
                </span>
              </div>
              <div>
                <div className="sstat-num">{buckets.todayAppts.length}</div>
                <div className="sstat-label">Today's Appointments</div>
              </div>
            </div>
            <div className="sstat">
              <div className="sstat-icon" style={{ background: "rgba(245, 166, 35, 0.1)" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--warning)", fontSize: "22px" }}>
                  schedule
                </span>
              </div>
              <div>
                <div className="sstat-num">{buckets.pending.length}</div>
                <div className="sstat-label">Pending Confirmation</div>
              </div>
            </div>
            <div className="sstat">
              <div className="sstat-icon" style={{ background: "rgba(26, 171, 109, 0.1)" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--success)", fontSize: "22px" }}>
                  check_circle
                </span>
              </div>
              <div>
                <div className="sstat-num">{buckets.confirmed.length}</div>
                <div className="sstat-label">Confirmed</div>
              </div>
            </div>
            <div className="sstat">
              <div className="sstat-icon" style={{ background: "rgba(124, 92, 191, 0.1)" }}>
                <span className="material-symbols-outlined" style={{ color: "#7c5cbf", fontSize: "22px" }}>
                  bar_chart
                </span>
              </div>
              <div>
                <div className="sstat-num">{buckets.all.length}</div>
                <div className="sstat-label">Total Appointments</div>
              </div>
            </div>
          </div>

          <div className="tabs">
            <button className={"tab-btn" + (tab === "today" ? " active" : "")} onClick={() => setTab("today")}>
              Today <span className="tab-count">{buckets.todayAppts.length}</span>
            </button>
            <button className={"tab-btn" + (tab === "week" ? " active" : "")} onClick={() => setTab("week")}>
              This Week <span className="tab-count">{buckets.weekAppts.length}</span>
            </button>
            <button className={"tab-btn" + (tab === "all" ? " active" : "")} onClick={() => setTab("all")}>
              All <span className="tab-count">{buckets.all.length}</span>
            </button>
          </div>

          <div className="schedule-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Patient</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan="5">
                      <div className="empty-state">
                        <div className="empty-state-icon">
                          <span className="material-symbols-outlined" style={{ fontSize: "48px" }}>
                            calendar_today
                          </span>
                        </div>
                        <div className="empty-state-title">No appointments</div>
                        <div className="empty-state-desc">No appointments found for this period.</div>
                      </div>
                    </td>
                  </tr>
                )}
                {visible.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{formatDate(a.appointmentDate)}</strong>
                      <br />
                      <span style={{ fontSize: "12px", color: "var(--muted)" }}>{formatTime(a.appointmentTime)}</span>
                    </td>
                    <td>{a.patientName || "—"}</td>
                    <td>{a.appointmentType || "Consultation"}</td>
                    <td>{a.reason || "—"}</td>
                    <td>
                      <span className={"badge " + (a.status || "pending").toLowerCase()}>{a.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
