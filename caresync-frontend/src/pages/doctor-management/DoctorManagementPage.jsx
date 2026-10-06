import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar.jsx";
import { api } from "../../lib/api";
import { useAuthGuard } from "../../lib/useAuthGuard";
import { useToast } from "../../lib/Toast.jsx";
import TopbarActions from "../../components/TopbarActions.jsx";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  specialization: "",
  qualification: "",
  departmentId: "",
  experience: "",
  phone: "",
  fee: "",
  days: "",
  email: "",
  password: "",
};

export default function DoctorManagementPage() {
  const { ready } = useAuthGuard();
  const toast = useToast();

  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("Add New Doctor");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  async function loadAll() {
    try {
      const [docs, depts] = await Promise.all([api.getDoctors(), api.getDepartments()]);
      setDoctors(docs || []);
      setDepartments(depts || []);
    } catch (e) {
      toast(e.message, "error");
    }
  }

  useEffect(() => {
    if (ready) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalTitle("Add New Doctor");
    setShowModal(true);
  }

  async function openEditModal(id) {
    try {
      const d = await api.getDoctor(id);
      setEditingId(id);
      setForm({
        firstName: d.firstName || "",
        lastName: d.lastName || "",
        specialization: d.specialization || "",
        qualification: d.qualification || "",
        departmentId: d.departmentId || "",
        experience: d.yearsOfExperience ?? "",
        phone: d.phone || "",
        fee: d.consultationFee ?? "",
        days: d.availableDays || "",
        email: d.email || "",
        password: "",
      });
      setModalTitle("Edit Doctor");
      setShowModal(true);
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function saveDoctor() {
    if (!form.firstName || !form.lastName || !form.specialization || !form.phone || !form.email || (!editingId && !form.password)) {
      toast("Fill required fields", "error");
      return;
    }
    const body = {
      firstName: form.firstName,
      lastName: form.lastName,
      specialization: form.specialization,
      qualification: form.qualification || null,
      departmentId: form.departmentId ? Number(form.departmentId) : null,
      phone: form.phone,
      yearsOfExperience: parseInt(form.experience, 10) || 0,
      consultationFee: parseFloat(form.fee) || 0,
      availableDays: form.days || null,
      email: form.email || null,
      password: form.password || null,
      isAvailable: true,
    };
    setSaving(true);
    try {
      if (editingId) await api.updateDoctor(editingId, body);
      else await api.createDoctor(body);
      toast("Doctor saved", "success");
      setShowModal(false);
      await loadAll();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  const filteredDoctors = doctors.filter((d) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [d.firstName, d.lastName, d.specialization, d.departmentName, d.doctorCode]
      .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    const matchesDepartment = !departmentFilter || String(d.departmentId) === String(departmentFilter);
    return matchesSearch && matchesDepartment;
  });

  if (!ready) return null;

  return (
    <>
      <AdminSidebar active="doctors" />

      <div className="main">
        <div className="topbar">
          <div className="page-title">Doctor Management</div>
          <div className="topbar-right">
            <TopbarActions />
            <button
              type="button"
              className="btn-add"
              onClick={openAddModal}
              style={{ display: "flex", alignItems: "center", gap: "4px" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                add
              </span>{" "}
              Add New Doctor
            </button>
          </div>
        </div>

        <div className="content">
          <div className="filter-row">
            <div className="search-box" style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px", color: "var(--muted)", position: "absolute", left: "10px" }}
              >
                search
              </span>
              <input
                type="text"
                placeholder="Search by doctor name, specialization, or department..."
                style={{ paddingLeft: "36px" }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="filter-select" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
            </select>
          </div>

          <div className="doctor-grid">
            {filteredDoctors.length === 0 && (
              <div style={{ padding: "24px", color: "var(--muted)" }}>No match found.</div>
            )}
            {filteredDoctors.map((d) => (
              <div className="doc-card" key={d.id}>
                <div className="doc-header">
                  <div className="doc-avatar" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "24px", color: "var(--teal)" }}>
                      medical_services
                    </span>
                  </div>
                  <div>
                    <div className="doc-name">
                      Dr. {d.firstName} {d.lastName}
                    </div>
                    <div className="doc-spec">{d.qualification || d.specialization}</div>
                  </div>
                </div>
                <div className="doc-details">
                  <div className="detail-row">
                    <span>Dept:</span>
                    <strong>{d.departmentName || "—"}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Phone:</span>
                    <strong>{d.phone}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Fee:</span>
                    <strong>৳{d.consultationFee || 0}</strong>
                  </div>
                </div>
                <div className="doc-footer">
                  <button
                    type="button"
                    className="act-btn"
                    title="Edit"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={() => openEditModal(d.id)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                      edit
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={"modal" + (showModal ? " open" : "")}>
        <div className="modal-content">
          <div className="modal-head">
            <h3>{modalTitle}</h3>
            <span className="close-btn" onClick={() => setShowModal(false)}>
              ×
            </span>
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
                <label>Login Email</label>
                <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="doctor@example.com" />
              </div>
              <div className="form-group">
                <label>Login Password {editingId ? "(leave blank to keep)" : ""}</label>
                <input type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} placeholder={editingId ? "Optional" : "Required"} />
              </div>
              <div className="form-group">
                <label>Specialization</label>
                <input
                  type="text"
                  value={form.specialization}
                  onChange={(e) => setField("specialization", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Qualification</label>
                <input
                  type="text"
                  value={form.qualification}
                  onChange={(e) => setField("qualification", e.target.value)}
                />
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
                <label>Experience (Years)</label>
                <input
                  type="number"
                  value={form.experience}
                  onChange={(e) => setField("experience", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
              </div>
              <div className="form-group">
                <label>Consultation Fee</label>
                <input type="number" value={form.fee} onChange={(e) => setField("fee", e.target.value)} />
              </div>
              <div className="form-group">
                <label>Available Days</label>
                <input type="text" value={form.days} onChange={(e) => setField("days", e.target.value)} />
              </div>
            </div>
          </div>
          <div className="modal-foot">
            <button className="btn-cancel" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="button" className="btn-save" onClick={saveDoctor} disabled={saving}>
              {saving ? "Saving..." : "Save Doctor"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
