import { logout } from "../lib/useAuthGuard";

const NAV_ITEMS = [
  { href: "/doctor-dashboard.html", icon: "dashboard", label: "Dashboard", key: "dashboard" },
  { href: "/doctor-schedule.html", icon: "calendar_today", label: "Schedule", key: "schedule" },
  { href: "/doctor-patients.html", icon: "groups", label: "My Patients", key: "patients" },
];

export default function DoctorSidebar({ active, doctor }) {
  function handleLogout(e) {
    e.preventDefault();
    logout();
  }

  const initials = doctor ? (doctor.firstName?.[0] || "") + (doctor.lastName?.[0] || "") : "DR";
  const name = doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : "Doctor Name";

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
          <div className="brand-sub">Doctor Portal</div>
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
          <div className="avatar">{initials.toUpperCase() || "DR"}</div>
          <div className="user-info">
            <div className="user-name">{name}</div>
            <div className="user-role">Doctor</div>
          </div>
        </div>
      </div>
    </div>
  );
}
