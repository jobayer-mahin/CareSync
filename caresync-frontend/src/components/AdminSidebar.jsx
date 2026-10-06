import { logout } from "../lib/useAuthGuard";

const NAV_ITEMS = [
  { href: "/dashboard.html", icon: "dashboard", label: "Dashboard", key: "dashboard" },
];

const MGMT_ITEMS = [
  { href: "/patient-management.html", icon: "groups", label: "Patients", key: "patients" },
  { href: "/doctor-management.html", icon: "medical_services", label: "Doctors", key: "doctors" },
  { href: "/department-management.html", icon: "domain", label: "Departments", key: "departments" },
  { href: "/appointment-system.html", icon: "calendar_today", label: "Appointments", key: "appointments" },
  { href: "/emergency.html", icon: "emergency", label: "Emergency", key: "emergency", danger: true },
  { href: "/billing-system.html", icon: "payments", label: "Billing", key: "billing" },
];

export default function AdminSidebar({ active }) {
  function handleLogout(e) {
    e.preventDefault();
    logout();
  }

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
          <div className="brand-sub">Hospital Management</div>
        </div>
      </div>

      <div className="sidebar-section">Main</div>
      {NAV_ITEMS.map((item) => (
        <a
          key={item.key}
          href={item.href}
          className={"nav-item" + (active === item.key ? " active" : "")}
        >
          <span className="material-symbols-outlined nav-icon">{item.icon}</span> {item.label}
        </a>
      ))}

      <div className="sidebar-section">Management</div>
      {MGMT_ITEMS.map((item) => (
        <a
          key={item.key}
          href={item.href}
          className={"nav-item" + (active === item.key ? " active" : "")}
        >
          <span
            className="material-symbols-outlined nav-icon"
            style={item.danger ? { color: "var(--danger)" } : undefined}
          >
            {item.icon}
          </span>{" "}
          {item.label}
        </a>
      ))}

      <div className="sidebar-bottom">
        <a href="#" onClick={handleLogout} className="nav-item">
          <span className="material-symbols-outlined nav-icon">logout</span> Logout
        </a>
        <div className="user-card">
          <div className="s-avatar">AD</div>
          <div>
            <div className="user-name">Dr. Admin</div>
            <div className="user-role">Administrator</div>
          </div>
        </div>
      </div>
    </div>
  );
}
