import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { setSession } from "../../lib/api";

const DEMO_CREDENTIALS = {
  patient: { email: "patient@demo.com", password: "pass123" },
  doctor: { email: "doctor@demo.com", password: "pass123" },
  admin: { email: "admin@caresync.com", password: "admin123" },
};

const ROLE_MAP = { patient: "PATIENT", doctor: "DOCTOR", admin: "ADMIN" };

const REDIRECT_MAP = {
  PATIENT: "/patient-dashboard.html",
  DOCTOR: "/doctor-dashboard.html",
  ADMIN: "/dashboard.html",
};

export default function LoginPage() {
  const [role, setRole] = useState("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // forgot-password dialog
  const [showForgot, setShowForgot] = useState(false);
  const [fpId, setFpId] = useState("");
  const [fpPhone, setFpPhone] = useState("");
  const [fpPass, setFpPass] = useState("");
  const [fpConfirm, setFpConfirm] = useState("");
  const [fpError, setFpError] = useState("");
  const [fpBusy, setFpBusy] = useState(false);

  // On mount: restore remembered credentials, or default to the patient demo login
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("caresync_remember_email");
    const rememberedPassword = localStorage.getItem("caresync_remember_password");
    const rememberedRole = localStorage.getItem("caresync_remember_role");

    if (rememberedEmail && rememberedPassword) {
      setEmail(rememberedEmail);
      setPassword(rememberedPassword);
      setRemember(true);
      if (rememberedRole) setRole(rememberedRole);
    } else {
      handleRoleClick("patient");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRoleClick(nextRole) {
    setRole(nextRole);
    const creds = DEMO_CREDENTIALS[nextRole];
    if (creds) {
      setEmail(creds.email);
      setPassword(creds.password);
    }
  }

  async function handleLogin() {
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const result = await api.login(email.trim(), password, ROLE_MAP[role]);
      setSession(result);

      if (remember) {
        localStorage.setItem("caresync_remember_email", email.trim());
        localStorage.setItem("caresync_remember_password", password);
        localStorage.setItem("caresync_remember_role", role);
      } else {
        localStorage.removeItem("caresync_remember_email");
        localStorage.removeItem("caresync_remember_password");
        localStorage.removeItem("caresync_remember_role");
      }

      const actualRole = result.role || ROLE_MAP[role];
      window.location.href = REDIRECT_MAP[actualRole] || "/dashboard.html";
    } catch (err) {
      setError(
        "Login failed: " +
          (err.message ||
            "Backend unavailable. cd caresync-backend && mvn spring-boot:run"),
      );
    } finally {
      setLoading(false);
    }
  }

  function openForgot(e) {
    e.preventDefault();
    setFpId(role === "admin" ? "" : email);
    setFpPhone("");
    setFpPass("");
    setFpConfirm("");
    setFpError("");
    setShowForgot(true);
  }

  async function handleReset() {
    setFpError("");
    if (!fpId.trim() || !fpPhone.trim() || !fpPass) {
      setFpError("Please fill in every field.");
      return;
    }
    if (fpPass.length < 6) {
      setFpError("New password must be at least 6 characters.");
      return;
    }
    if (fpPass !== fpConfirm) {
      setFpError("The two passwords do not match.");
      return;
    }
    setFpBusy(true);
    try {
      await api.forgotPassword(fpId.trim(), fpPhone.trim(), fpPass);
      // an old remembered password would no longer work
      localStorage.removeItem("caresync_remember_email");
      localStorage.removeItem("caresync_remember_password");
      localStorage.removeItem("caresync_remember_role");
      setRemember(false);
      setEmail(fpId.trim());
      setPassword("");
      setError("");
      setNotice("Password updated. Sign in with your new password.");
      setShowForgot(false);
    } catch (err) {
      setFpError(err.message || "Could not reset the password.");
    } finally {
      setFpBusy(false);
    }
  }

  function handleKeyDown(e) { if (e.key === "Enter") handleLogin(); }

  return (
    <>
      <div className="left-panel">
        <div className="brand">
          <div className="brand-icon">
            <span className="material-symbols-outlined" style={{ color: "white", fontSize: "22px" }}>
              local_hospital
            </span>
          </div>
          <div>
            <div className="brand-name">CareSync HMS</div>
            <div className="brand-sub">Hospital Management System</div>
          </div>
        </div>

        <div className="hero-text">
          <h1>
            Smarter Care,
            <br />
            <span>Better Outcomes.</span>
          </h1>
          <p>An integrated platform for patients, doctors, and administrators.</p>
        </div>

        <div className="stats-row">
          <div className="stat-item">
            <div className="stat-num">1,240+</div>
            <div className="stat-label">Patients Managed</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">86</div>
            <div className="stat-label">Active Doctors</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">24/7</div>
            <div className="stat-label">System Uptime</div>
          </div>
        </div>
      </div>

      <div className="right-panel">
        <div className="login-box">
          <h2>Welcome</h2>
          <p className="sub">Sign in to your account to continue</p>

          <div className="role-tabs">
            <button
              type="button"
              className={"role-tab" + (role === "patient" ? " active" : "")}
              onClick={() => handleRoleClick("patient")}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px", marginRight: "4px", verticalAlign: "middle" }}
              >
                groups
              </span>{" "}
              Patient
            </button>
            <button
              type="button"
              className={"role-tab" + (role === "doctor" ? " active" : "")}
              onClick={() => handleRoleClick("doctor")}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px", marginRight: "4px", verticalAlign: "middle" }}
              >
                medical_services
              </span>{" "}
              Doctor
            </button>
            <button
              type="button"
              className={"role-tab" + (role === "admin" ? " active" : "")}
              onClick={() => handleRoleClick("admin")}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px", marginRight: "4px", verticalAlign: "middle" }}
              >
                admin_panel_settings
              </span>{" "}
              Admin
            </button>
          </div>

          <div className="form-group">
            <label>Email / ID</label>
            <div className="input-wrap">
              <span
                className="material-symbols-outlined icon"
                style={{ fontSize: "18px", color: "var(--muted)", verticalAlign: "middle", marginRight: "8px" }}
              >
                mail
              </span>
              <input
                type="text"
                placeholder="Enter your email or ID"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-wrap">
              <span
                className="material-symbols-outlined icon"
                style={{ fontSize: "18px", color: "var(--muted)", verticalAlign: "middle", marginRight: "8px" }}
              >
                lock
              </span>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          {notice && !error && (
            <div style={{ color: "#1aab6d", fontSize: "13px", marginBottom: "10px", fontWeight: 500 }}>
              {notice}
            </div>
          )}
          {error && (
            <div style={{ color: "var(--danger, #e05252)", fontSize: "13px", marginBottom: "10px" }}>
              {error}
            </div>
          )}

          <div className="form-row">
            <label className="remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />{" "}
              Remember Me
            </label>
            <a href="#" className="forgot" onClick={openForgot}>
              Forgot Password?
            </a>
          </div>

          <button className="btn-login" onClick={handleLogin} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms &amp; Conditions</a>
            <a href="#">Support</a>
          </div>
        </div>
      </div>
      {showForgot && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(13, 27, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowForgot(false);
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "420px",
              padding: "26px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: "20px", marginBottom: "6px", color: "#0d1b2a" }}>
              Reset your password
            </h2>
            <p style={{ fontSize: "13px", color: "#6b8fa3", marginBottom: "16px", lineHeight: 1.5 }}>
              For patients and doctors. Enter your login (Patient ID or email) and the phone number saved on your
              profile, then choose a new password. Admins should contact the system owner.
            </p>

            <div className="form-group">
              <label>Patient ID / Email</label>
              <div className="input-wrap">
                <input type="text" placeholder="e.g. PT-0001 or doctor@demo.com" value={fpId} onChange={(e) => setFpId(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Registered phone number</label>
              <div className="input-wrap">
                <input type="tel" placeholder="Phone number on your profile" value={fpPhone} onChange={(e) => setFpPhone(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>New password</label>
              <div className="input-wrap">
                <input type="password" placeholder="At least 6 characters" value={fpPass} onChange={(e) => setFpPass(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Confirm new password</label>
              <div className="input-wrap">
                <input
                  type="password"
                  placeholder="Repeat the new password"
                  value={fpConfirm}
                  onChange={(e) => setFpConfirm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleReset();
                  }}
                />
              </div>
            </div>

            {fpError && <div style={{ color: "var(--danger, #e05252)", fontSize: "13px", marginBottom: "10px" }}>{fpError}</div>}

            <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "8px",
                  border: "1px solid #dde8ed",
                  background: "#fff",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button type="button" className="btn-login" style={{ flex: 1, marginTop: 0 }} onClick={handleReset} disabled={fpBusy}>
                {fpBusy ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
