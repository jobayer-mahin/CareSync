import { useEffect, useMemo, useRef, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar.jsx";
import { api } from "../../lib/api";
import { useAuthGuard } from "../../lib/useAuthGuard";
import { useToast } from "../../lib/Toast.jsx";
import { ageFromDob, formatDate, initials, statusBadgeClass, loadExternalScript } from "../../lib/ui";
import TopbarActions from "../../components/TopbarActions.jsx";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "Male",
  bloodGroup: "A+",
  phone: "",
  emergencyContact: "",
  address: "",
  initialDiagnosis: "",
  status: "Active",
  admissionDate: "",
  departmentId: "",
  assignedDoctorId: "",
  password: "",
};

export default function PatientManagementPage() {
  const { ready } = useAuthGuard();
  const toast = useToast();

  const [patients, setPatients] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All Status");
  const [filterDept, setFilterDept] = useState("All Departments");
  const [filterGender, setFilterGender] = useState("All Gender");

  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("Add New Patient");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [showQr, setShowQr] = useState(false);
  const qrScannerRef = useRef(null);
  const [qrResult, setQrResult] = useState("");

  // Debounce the search box (matches the original 400ms setTimeout)
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  async function loadAll() {
    try {
      const [pRes, dRes, docRes] = await Promise.all([
        api.getPatients(),
        api.getDepartments(),
        api.getDoctors(),
      ]);
      setPatients(pRes || []);
      setDepartments(dRes || []);
      setDoctors(docRes || []);
    } catch (e) {
      toast(e.message, "error");
    }
  }

  useEffect(() => {
    if (ready) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const filtered = useMemo(() => {
    let list = patients;
    if (search) {
      list = list.filter(
        (p) =>
          (p.firstName + " " + p.lastName).toLowerCase().includes(search) ||
          (p.patientCode || "").toLowerCase().includes(search) ||
          (p.phone || "").includes(search),
      );
    }
    if (filterStatus !== "All Status") list = list.filter((p) => p.status === filterStatus);
    if (filterDept !== "All Departments") list = list.filter((p) => p.departmentName === filterDept);
    if (filterGender !== "All Gender") list = list.filter((p) => p.gender === filterGender);
    return list;
  }, [patients, search, filterStatus, filterDept, filterGender]);

  const stats = useMemo(
    () => ({
      total: filtered.length,
      admitted: filtered.filter((p) => p.status === "Admitted").length,
      critical: filtered.filter((p) => p.status === "Critical").length,
      discharged: filtered.filter((p) => p.status === "Discharged").length,
    }),
    [filtered],
  );

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalTitle("Add New Patient");
    setShowModal(true);
  }

  async function openEditModal(id) {
    try {
      const p = await api.getPatient(id);
      setEditingId(id);
      setForm({
        firstName: p.firstName || "",
        lastName: p.lastName || "",
        dateOfBirth: p.dateOfBirth || "",
        gender: p.gender || "Male",
        bloodGroup: p.bloodGroup || "A+",
        phone: p.phone || "",
        emergencyContact: p.emergencyContact || "",
        address: p.address || "",
        initialDiagnosis: p.initialDiagnosis || "",
        status: p.status || "Active",
        admissionDate: p.admissionDate ? p.admissionDate.slice(0,16) : "",
        departmentId: p.departmentId || "",
        assignedDoctorId: p.assignedDoctorId || "",
        password: "",
      });
      setModalTitle("Edit Patient");
      setShowModal(true);
    } catch (e) {
      toast(e.message, "error");
    }
  }

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function savePatient() {
    if (!form.firstName || !form.lastName || !form.dateOfBirth || !form.phone) {
      toast("Please fill required fields", "error");
      return;
    }
    if (!editingId && !form.password) {
      toast("Please set a password for the patient's login", "error");
      return;
    }
    const body = {
      ...form,
      emergencyContact: form.emergencyContact || null,
      address: form.address || null,
      initialDiagnosis: form.initialDiagnosis || null,
      departmentId: form.departmentId ? Number(form.departmentId) : null,
      assignedDoctorId: form.assignedDoctorId ? Number(form.assignedDoctorId) : null,
    };
    setSaving(true);
    try {
      if (editingId) {
        await api.updatePatient(editingId, body);
        toast("Patient updated", "success");
      } else {
        const created = await api.createPatient(body);
        toast(
          "Patient " + body.firstName + " registered. Login ID: " + (created.patientCode || "generated ID"),
          "success",
        );
      }
      setShowModal(false);
      await loadAll();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function removePatient(id) {
    if (!confirm("Delete this patient?")) return;
    try {
      await api.deletePatient(id);
      toast("Patient deleted", "success");
      await loadAll();
    } catch (e) {
      toast(e.message, "error");
    }
  }

  // --- QR scanner (real html5-qrcode integration) ---
  async function openQrScanner() {
    setQrResult(""); setShowQr(true);
    try {
      await loadExternalScript("https://unpkg.com/html5-qrcode");
      if (!window.Html5QrcodeScanner) throw new Error("QR scanner library could not be loaded");
      if (qrScannerRef.current) { try { await qrScannerRef.current.clear(); } catch {} qrScannerRef.current = null; }
      qrScannerRef.current = new window.Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      qrScannerRef.current.render(onScanSuccess, (errorMessage) => { if (errorMessage && !String(errorMessage).includes("NotFoundException")) setQrResult("Point the camera at a patient QR code"); });
    } catch (e) { setQrResult(e.message || "Camera unavailable"); }
  }

  async function closeQrScanner() {
    const scanner = qrScannerRef.current; qrScannerRef.current = null;
    if (scanner) { try { await scanner.clear(); } catch {} }
    setShowQr(false);
  }

  async function onScanSuccess(decodedText) {
    setQrResult("QR detected. Checking patient in...");
    try {
      const patient = await api.qrCheckIn(decodedText);
      await closeQrScanner();
      toast(`${patient.firstName} ${patient.lastName} checked in successfully`, "success");
      await loadAll();
      openEditModal(patient.id);
    } catch (e) {
      setQrResult("Invalid QR: " + e.message);
    }
  }

  if (!ready) return null;

  return (
    <>
      <AdminSidebar active="patients" />

      <div className="main">
        <div className="topbar">
          <div className="page-title">Patient Management</div>
          <div className="topbar-right">
            <TopbarActions />
            <button
              className="btn-outline"
              onClick={openQrScanner}
              style={{ borderColor: "var(--teal)", color: "var(--teal)", display: "flex", alignItems: "center", gap: "4px" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                photo_camera
              </span>{" "}
              Scan QR Check-in
            </button>
            <button type="button" className="btn-primary" onClick={openAddModal}>
              + Add Patient
            </button>
          </div>
        </div>

        <div className="content">
          <div className="mini-stats">
            <div className="mini-card">
              <div className="mini-icon">
                <span className="material-symbols-outlined" style={{ fontSize: "24px", color: "var(--teal)" }}>
                  groups
                </span>
              </div>
              <div className="mini-num">{stats.total}</div>
              <div className="mini-label">Total Patients</div>
            </div>
            <div className="mini-card">
              <div className="mini-icon">
                <span className="material-symbols-outlined" style={{ fontSize: "24px", color: "var(--teal)" }}>
                  local_hospital
                </span>
              </div>
              <div className="mini-num">{stats.admitted}</div>
              <div className="mini-label">Currently Admitted</div>
            </div>
            <div className="mini-card">
              <div className="mini-icon">
                <span className="material-symbols-outlined" style={{ fontSize: "24px", color: "var(--danger)" }}>
                  emergency
                </span>
              </div>
              <div className="mini-num">{stats.critical}</div>
              <div className="mini-label">Critical Cases</div>
            </div>
            <div className="mini-card">
              <div className="mini-icon">
                <span className="material-symbols-outlined" style={{ fontSize: "24px", color: "var(--success)" }}>
                  check_circle
                </span>
              </div>
              <div className="mini-num">{stats.discharged}</div>
              <div className="mini-label">Discharged This Month</div>
            </div>
          </div>

          <div className="filters-row">
            <div className="search-bar" style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px", color: "var(--muted)", position: "absolute", left: "10px" }}
              >
                search
              </span>
              <input
                type="text"
                placeholder="Search by name, ID, phone..."
                style={{ paddingLeft: "36px" }}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option>All Status</option>
              <option>Active</option>
              <option>Admitted</option>
              <option>Discharged</option>
              <option>Critical</option>
            </select>
            <select className="filter-select" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
              <option>All Departments</option>
              <option>Cardiology</option>
              <option>Orthopedics</option>
              <option>Neurology</option>
              <option>Gynecology</option>
              <option>Emergency</option>
            </select>
            <select className="filter-select" value={filterGender} onChange={(e) => setFilterGender(e.target.value)}>
              <option>All Gender</option>
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>

          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Age / Gender</th>
                  <th>Contact</th>
                  <th>Department</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th>Admitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>
                      No patients found.
                    </td>
                  </tr>
                )}
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="patient-cell">
                        <div className="pt-avatar" style={{ background: "#0a7c7c" }}>
                          {initials(p.firstName, p.lastName)}
                        </div>
                        <div>
                          <div className="pt-name">
                            {p.firstName} {p.lastName}
                          </div>
                          <div className="pt-id">{p.patientCode || ""}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {ageFromDob(p.dateOfBirth)} / {p.gender || "—"}
                    </td>
                    <td>{p.phone || "—"}</td>
                    <td>{p.departmentName || "—"}</td>
                    <td>{p.assignedDoctorName || "—"}</td>
                    <td>
                      <span className={"status-badge " + statusBadgeClass(p.status)}>{p.status || "Active"}</span>
                    </td>
                    <td>{formatDate(p.admissionDate)}</td>
                    <td>
                      <div className="action-btns">
                        <button
                          type="button"
                          className="act-btn"
                          title="Edit"
                          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                          onClick={() => openEditModal(p.id)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                            edit
                          </span>
                        </button>
                        <button
                          type="button"
                          className="act-btn"
                          title="Delete"
                          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                          onClick={() => removePatient(p.id)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                            delete
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
              <div className="pag-info">
                Showing {filtered.length} patient{filtered.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={"modal-overlay" + (showModal ? " show" : "")}>
        <div className="modal">
          <div className="modal-head">
            <div className="modal-title">{modalTitle}</div>
            <button type="button" className="modal-close" onClick={() => setShowModal(false)}>
              ✕
            </button>
          </div>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>First Name</label>
                <input type="text" value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input type="text" value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} />
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" value={form.dateOfBirth} onChange={(e) => setField("dateOfBirth", e.target.value)} />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select value={form.gender} onChange={(e) => setField("gender", e.target.value)}>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
              </div>
              <div className="form-group">
                <label>Blood Group</label>
                <select value={form.bloodGroup} onChange={(e) => setField("bloodGroup", e.target.value)}>
                  <option value="">—</option>
                  <option>A+</option>
                  <option>A-</option>
                  <option>B+</option>
                  <option>B-</option>
                  <option>O+</option>
                  <option>O-</option>
                  <option>AB+</option>
                  <option>AB-</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
                  <option>Active</option>
                  <option>Admitted</option>
                  <option>Discharged</option>
                  <option>Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label>Admission Date &amp; Time</label>
                <input type="datetime-local" value={form.admissionDate} onChange={(e) => setField("admissionDate", e.target.value)} />
              </div>
              <div className="form-group full">
                <label>Address</label>
                <input type="text" value={form.address} onChange={(e) => setField("address", e.target.value)} />
              </div>
              <div className="form-group">
                <label>Department</label>
                <select value={form.departmentId} onChange={(e) => setField("departmentId", e.target.value)}>
                  <option value="">—</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.departmentName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Assigned Doctor</label>
                <select value={form.assignedDoctorId} onChange={(e) => setField("assignedDoctorId", e.target.value)}>
                  <option value="">—</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.firstName} {d.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{editingId ? "Password (leave blank to keep current)" : "Patient Login Password"}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder={editingId ? "Leave blank to keep current password" : "Set login password"}
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group full">
                <label>Initial Diagnosis</label>
                <textarea
                  rows="3"
                  value={form.initialDiagnosis}
                  onChange={(e) => setField("initialDiagnosis", e.target.value)}
                ></textarea>
              </div>
            </div>
          </div>
          <div className="modal-foot">
            <button className="btn-cancel" type="button" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={savePatient} disabled={saving}>
              {saving ? "Saving..." : "Save Patient"}
            </button>
          </div>
        </div>
      </div>

      <div className={"modal-overlay" + (showQr ? " show" : "")}>
        <div className="modal" style={{ width: "400px" }}>
          <div className="modal-head">
            <div className="modal-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--teal)" }}>
                photo_camera
              </span>{" "}
              Scan Patient QR
            </div>
            <button type="button" className="modal-close" onClick={closeQrScanner}>
              ✕
            </button>
          </div>
          <div className="modal-body" style={{ textAlign: "center" }}>
            <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "16px" }}>
              Hold the patient's QR code up to the webcam to instantly check them in.
            </p>
            <div
              id="qr-reader"
              style={{ width: "100%", border: "2px dashed var(--teal)", borderRadius: "12px", overflow: "hidden", marginBottom: "16px" }}
            ></div>
            <div style={{ fontSize: "14px", fontWeight: "bold", color: "var(--success)", height: "20px" }}>{qrResult}</div>
          </div>
        </div>
      </div>
    </>
  );
}
