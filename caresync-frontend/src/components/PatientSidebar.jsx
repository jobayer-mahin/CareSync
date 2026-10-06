import { logout } from "../lib/useAuthGuard";

const NAV_ITEMS = [
  { href: "/patient-dashboard.html", icon: "dashboard", label: "Dashboard", key: "dashboard" },
  { href: "/patient-appointments.html", icon: "calendar_today", label: "Appointments", key: "appointments" },
  { href: "/patient-billing.html", icon: "credit_card", label: "Billing & Invoices", key: "billing" },
  { href: "/patient-ehr.html", icon: "folder_open", label: "Health Records", key: "ehr" },
];

export default function PatientSidebar({ active, patient }) {
  function handleLogout(e) {
    e.preventDefault();
    logout();
  }

  const initials = patient ? (patient.firstName?.[0] || "") + (patient.lastName?.[0] || "") : "PT";
  const name = patient ? `${patient.firstName} ${patient.lastName}` : "Patient Name";

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="material-symbols-outlined" style={{ color: "white", fontSize: "20px" }}>
            local_hospital
          </span>
        </div>
        <div>
          <div className="brand-text">CareSync</div>
          <div className="brand-sub">Patient Portal</div>
        </div>
      </div>

      <div className="sidebar-section">Menu</div>
      {NAV_ITEMS.map((item) => (
        <a key={item.key} href={item.href} className={"nav-item" + (active === item.key ? " active" : "")}>
          <span className="material-symbols-outlined nav-icon">{item.icon}</span> {item.label}
        </a>
      ))}

      <div className="sidebar-bottom">
        <a href="#" onClick={handleLogout} className="nav-item">
          <span className="material-symbols-outlined nav-icon">logout</span> Logout
        </a>
        <div className="user-card">
          <div className="avatar">{initials.toUpperCase() || "PT"}</div>
          <div className="user-info">
            <div className="user-name">{name}</div>
            <div className="user-role">Patient</div>
          </div>
        </div>
      </div>
    </div>
  );
}
