import { useEffect, useMemo, useState } from "react";
import DoctorSidebar from "../../components/DoctorSidebar.jsx";
import { api } from "../../lib/api";
import { useAuthGuard } from "../../lib/useAuthGuard";
import { useMyDoctor } from "../../lib/useMyDoctor";
import { initials, currentDateLong } from "../../lib/ui";
import TopbarActions from "../../components/TopbarActions.jsx";

const AVATAR_COLORS = ["#0a7c7c", "#13a8a8", "#7c5cbf", "#e05252", "#f5a623"];

export default function DoctorPatientsPage() {
  const { ready } = useAuthGuard("DOCTOR");
  const { doctor, loading: doctorLoading } = useMyDoctor();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!ready || doctorLoading || !doctor) return;
    api
      .getPatients()
      .then((res) => setPatients((res || []).filter((p) => p.assignedDoctorId === doctor.id)))
      .catch(() => {});
  }, [ready, doctorLoading, doctor]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return patients.filter((p) => {
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      const code = (p.patientCode || "").toLowerCase();
      const matchesSearch = fullName.includes(query) || code.includes(query);
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [patients, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: patients.length,
      active: patients.filter((p) => p.status === "Active").length,
      admitted: patients.filter((p) => p.status === "Admitted").length,
    }),
    [patients],
  );

  function avatarColor(p) {
    const idx = (p.firstName.charCodeAt(0) + (p.lastName ? p.lastName.charCodeAt(0) : 0)) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
  }

  if (!ready) return null;

  return (
    <>
      <DoctorSidebar active="patients" doctor={doctor} />

      <div className="main">
        <div className="topbar">
          <div className="page-title">My Patients</div>
          <div className="topbar-right">
            <TopbarActions />
            <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--muted)" }}>{currentDateLong()}</span>
          </div>
        </div>

        <div className="content" style={{ padding: "32px" }}>
          <div className="patient-count-bar">
            <div className="pc-item">
              <span className="material-symbols-outlined" style={{ color: "var(--teal)", fontSize: "22px" }}>
                groups
              </span>
              <div>
                <div className="pc-num">{stats.total}</div>
                <div className="pc-label">Total Assigned</div>
              </div>
            </div>
            <div className="pc-item">
              <span className="material-symbols-outlined" style={{ color: "var(--success)", fontSize: "22px" }}>
                check_circle
              </span>
              <div>
                <div className="pc-num">{stats.active}</div>
                <div className="pc-label">Active</div>
              </div>
            </div>
            <div className="pc-item">
              <span className="material-symbols-outlined" style={{ color: "var(--warning)", fontSize: "22px" }}>
                local_hospital
              </span>
              <div>
                <div className="pc-num">{stats.admitted}</div>
                <div className="pc-label">Admitted</div>
              </div>
            </div>
          </div>

          <div className="filter-bar">
            <div className="search-input">
              <span className="material-symbols-outlined" style={{ color: "var(--muted)", fontSize: "18px" }}>
                search
              </span>
              <input
                type="text"
                placeholder="Search by name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="status-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Admitted">Admitted</option>
              <option value="Discharged">Discharged</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div className="patients-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Code</th>
                  <th>Blood Group</th>
                  <th>Phone</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="5">
                      <div className="empty-state">
                        <div className="empty-state-icon">
                          <span className="material-symbols-outlined" style={{ fontSize: "48px" }}>
                            groups
                          </span>
                        </div>
                        <div className="empty-state-title">No Patients Found</div>
                        <div style={{ fontSize: "13px" }}>Try checking other statuses or search filters.</div>
                      </div>
                    </td>
                  </tr>
                )}
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="pt-cell">
                        <div className="pt-av" style={{ background: avatarColor(p) }}>
                          {initials(p.firstName, p.lastName)}
                        </div>
                        <div>
                          <div className="pt-name">
                            {p.firstName} {p.lastName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{p.patientCode}</strong>
                    </td>
                    <td>{p.bloodGroup || "—"}</td>
                    <td>{p.phone || "—"}</td>
                    <td>
                      <span className={"badge " + (p.status ? p.status.toLowerCase() : "active")}>{p.status || "Active"}</span>
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
