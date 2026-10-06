import { useEffect, useMemo, useRef, useState } from "react";
import DoctorSidebar from "../../components/DoctorSidebar.jsx";
import { api } from "../../lib/api";
import { useAuthGuard } from "../../lib/useAuthGuard";
import { useMyDoctor } from "../../lib/useMyDoctor";
import { useToast } from "../../lib/Toast.jsx";
import { currentDateLong, initials, loadExternalScript, todayISO } from "../../lib/ui";
import { useDrawingPad, clearCanvas, isCanvasBlank } from "../../lib/useDrawingPad";
import { useDictation } from "../../lib/useDictation";
import TopbarActions from "../../components/TopbarActions.jsx";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function DoctorDashboardPage() {
  const { ready } = useAuthGuard("DOCTOR");
  const { doctor, loading: doctorLoading } = useMyDoctor();
  const toast = useToast();

  const [doctorData, setDoctorData] = useState(null); // local mutable copy, updated after profile save
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    if (doctor) setDoctorData(doctor);
  }, [doctor]);

  useEffect(() => {
    if (!ready || !doctorData) return;
    api
      .getAppointments()
      .then((res) => setAppointments((res || []).filter((a) => a.doctorId === doctorData.id)))
      .catch(() => {});
    api
      .getPatients()
      .then((res) => setPatients((res || []).filter((p) => p.assignedDoctorId === doctorData.id)))
      .catch(() => {});
  }, [ready, doctorData?.id]);

  const stats = useMemo(() => {
    const today = todayISO();
    return {
      today: appointments.filter((a) => a.appointmentDate === today).length,
      pending: appointments.filter((a) => a.status === "Pending").length,
      patients: patients.length,
    };
  }, [appointments, patients]);

  // ---- Clinical notes dictation ----
  const [dictationPatientId, setDictationPatientId] = useState("");
  const [dictationText, setDictationText] = useState("");
  const dictation = useDictation((text) => setDictationText(text), " ");

  function handleToggleDictation() {
    const { error } = dictation.toggle(dictationText);
    if (error) toast(error, "error");
    else if (!dictation.isDictating) toast("Listening... Please speak clearly.", "info");
  }

  async function saveClinicalNote() {
    if (!dictationPatientId) {
      toast("Please select a patient first", "warning");
      return;
    }
    const noteText = dictationText.trim();
    if (!noteText) {
      toast("Clinical note is empty", "warning");
      return;
    }
    const selectedPatient = patients.find((p) => p.id == dictationPatientId);
    const patientName = selectedPatient ? `${selectedPatient.firstName}_${selectedPatient.lastName}` : "Patient";
    const dateStr = todayISO();
    const fileName = `clinical_note_${patientName}_${dateStr}.txt`;

    const bytes = new TextEncoder().encode(noteText);
    const binString = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
    const fileDataUrl = "data:text/plain;charset=utf-8;base64," + btoa(binString);

    try {
      await api.createEhrDocument({
        patientId: parseInt(dictationPatientId, 10),
        documentName: fileName,
        fileSize: bytes.byteLength,
        fileType: "text/plain",
        category: "prescription",
        fileData: fileDataUrl,
      });
      toast("Clinical note saved to patient's EHR!", "success");
      setDictationText("");
    } catch {
      toast("Failed to save clinical note", "error");
    }
  }

  // ---- E-Prescription ----
  const [prescPatientId, setPrescPatientId] = useState("");
  const [prescDiagnosis, setPrescDiagnosis] = useState("");
  const [prescMeds, setPrescMeds] = useState("");
  const [enableHandwritten, setEnableHandwritten] = useState(false);
  const [savingPrescription, setSavingPrescription] = useState(false);
  const medDictation = useDictation((text) => setPrescMeds(text), "\n");
  const handwrittenCanvasRef = useRef(null);
  useDrawingPad(handwrittenCanvasRef, enableHandwritten);

  function handleToggleMedDictation() {
    const { error } = medDictation.toggle(prescMeds);
    if (error) toast(error, "error");
    else if (!medDictation.isDictating) toast("Listening for medications list...", "info");
  }

  function resetPrescriptionForm() {
    setPrescDiagnosis("");
    setPrescMeds("");
    setEnableHandwritten(false);
    setPrescPatientId("");
    clearCanvas(handwrittenCanvasRef);
  }

  async function generateAndSavePrescription() {
    if (!prescPatientId) {
      toast("Please select a patient first", "warning");
      return;
    }
    const diagnosis = prescDiagnosis.trim();
    const meds = prescMeds.trim();

    let handwrittenDataUrl = null;
    if (enableHandwritten && handwrittenCanvasRef.current && !isCanvasBlank(handwrittenCanvasRef)) {
      handwrittenDataUrl = handwrittenCanvasRef.current.toDataURL();
    }

    if (!diagnosis && !meds && !handwrittenDataUrl) {
      toast("Please enter prescription details or draw handwritten notes", "warning");
      return;
    }

    const selectedPatient = patients.find((p) => p.id == prescPatientId);

    setSavingPrescription(true);
    try {
      await loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js");
      if (!window.html2pdf) throw new Error("PDF library failed to load");

      const element = document.createElement("div");
      element.style.padding = "30px";
      element.style.fontFamily = "'DM Sans', sans-serif";
      element.style.color = "#1e293b";
      element.style.background = "#ffffff";
      element.style.width = "640px";

      const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      const docName = doctorData ? `Dr. ${doctorData.firstName} ${doctorData.lastName}` : "Attending Doctor";
      const docSpec = doctorData ? doctorData.specialization : "General Medicine";
      const docQual = doctorData ? doctorData.qualification || "" : "";
      const docPhone = doctorData ? doctorData.phone : "";
      const docDept = doctorData ? doctorData.departmentName || "General" : "General";

      let sigImgHtml = "";
      if (doctorData?.signatureData) {
        sigImgHtml = `<img src="${doctorData.signatureData}" style="max-height: 50px; display: block; margin: 8px auto 0 auto; border-bottom: 1px solid #ddd;" />`;
      }

      let handwrittenHtml = "";
      if (handwrittenDataUrl) {
        handwrittenHtml = `
          <div style="margin-top: 20px; border-top: 1.5px solid #e2e8f0; padding-top: 12px;">
            <h4 style="font-family: 'Sora', sans-serif; font-size: 11px; color: #0f172a; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.5px;">Handwritten Notes / Sketches</h4>
            <div style="border: 1px dashed #cbd5e1; border-radius: 8px; overflow: hidden; background: #fafafa; padding: 6px; text-align: center;">
              <img src="${handwrittenDataUrl}" style="max-width: 100%; max-height: 160px; object-fit: contain;" />
            </div>
          </div>`;
      }

      element.innerHTML = `
        <div style="border: 2px solid #0f766e; border-radius: 12px; overflow: hidden; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 20px;">
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 16px;">
            <div>
              <h2 style="font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 700; color: #0f766e; margin: 0 0 2px 0;">🏥 CareSync HMS</h2>
              <div style="font-size: 12px; font-weight: 600; color: #0f172a;">${docName}</div>
              <div style="font-size: 11px; color: #475569;">${docSpec} · ${docQual}</div>
              <div style="font-size: 10px; color: #64748b;">Dept: ${docDept} | Phone: ${docPhone}</div>
            </div>
            <div style="text-align: right;">
              <h3 style="font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 700; color: #475569; text-transform: uppercase; margin: 0 0 6px 0; letter-spacing: 0.5px;">E-Prescription</h3>
              <div style="font-size: 11px; color: #64748b;"><strong>Date:</strong> ${dateStr}</div>
            </div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; font-size: 11px; color: #334155; margin-bottom: 16px;">
            <div>
              <strong>Patient Name:</strong> ${selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : "N/A"}<br/>
              <strong>Code:</strong> ${selectedPatient ? selectedPatient.patientCode : "N/A"}
            </div>
            <div style="text-align: right;">
              <strong>Phone:</strong> ${selectedPatient ? selectedPatient.phone : "N/A"}<br/>
              <strong>Blood Group:</strong> ${selectedPatient ? selectedPatient.bloodGroup || "N/A" : "N/A"}
            </div>
          </div>
          <div style="display: flex; min-height: 200px; gap: 20px;">
            <div style="width: 35%; border-right: 1.5px solid #e2e8f0; padding-right: 12px;">
              <h4 style="font-family: 'Sora', sans-serif; font-size: 11px; color: #0f172a; text-transform: uppercase; margin: 0 0 6px 0; letter-spacing: 0.5px;">Diagnosis / Dx</h4>
              <div style="font-size: 12px; line-height: 1.5; color: #334155; font-style: italic; white-space: pre-wrap;">${diagnosis || "General medical consultation."}</div>
            </div>
            <div style="width: 65%;">
              <div style="font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 700; color: #0f766e; margin-bottom: 8px;">Rx</div>
              <div style="font-size: 13px; line-height: 1.5; color: #1e293b; font-family: monospace; white-space: pre-wrap;">${meds || "No oral medications prescribed."}</div>
            </div>
          </div>
          ${handwrittenHtml}
          <div style="margin-top: 24px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="font-size: 10px; color: #64748b;">This is an electronically generated prescription.<br/>CareSync HMS General Hospital, Dhaka.</div>
            <div style="text-align: center; width: 150px;">
              ${sigImgHtml}
              <div style="font-size: 11px; font-weight: 600; color: #0f172a; margin-top: 4px; border-top: 1px solid #ddd; padding-top: 2px;">Authorized Signature</div>
            </div>
          </div>
        </div>`;

      const patientNameClean = selectedPatient ? `${selectedPatient.firstName}_${selectedPatient.lastName}` : "Patient";
      const fileBaseName = `prescription_${patientNameClean}_${todayISO()}`;
      const opt = {
        margin: 10,
        filename: `${fileBaseName}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      toast("Generating prescription sheet...", "info");
      const pdfDataUrl = await window.html2pdf().set(opt).from(element).outputPdf("datauristring");

      await api.createEhrDocument({
        patientId: parseInt(prescPatientId, 10),
        documentName: `${fileBaseName}.pdf`,
        fileSize: Math.round(pdfDataUrl.length * 0.75),
        fileType: "application/pdf",
        category: "prescription",
        fileData: pdfDataUrl,
      });
      toast("Prescription saved to patient's EHR database!", "success");

      await window.html2pdf().set(opt).from(element).save();
      toast("Prescription PDF downloaded successfully!", "success");

      resetPrescriptionForm();
    } catch (e) {
      toast("Failed to generate prescription: " + e.message, "error");
    } finally {
      setSavingPrescription(false);
    }
  }

  // ---- Profile editing modal ----
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [tempSlots, setTempSlots] = useState([]);
  const [slotDay, setSlotDay] = useState("Sunday");
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const sigCanvasRef = useRef(null);
  useDrawingPad(sigCanvasRef, showProfileModal);

  function openProfileModal() {
    if (!doctorData) return;
    setProfileForm({
      firstName: doctorData.firstName || "",
      lastName: doctorData.lastName || "",
      specialization: doctorData.specialization || "",
      phone: doctorData.phone || "",
      fee: doctorData.consultationFee || 0,
      experience: doctorData.yearsOfExperience || 0,
      biography: doctorData.biography || "",
    });
    setAvatarPreview(doctorData.avatarData || "");
    let slots = [];
    if (doctorData.availableSlots) {
      try {
        slots = JSON.parse(doctorData.availableSlots);
      } catch {
        /* ignore malformed slots */
      }
    }
    setTempSlots(slots);
    setShowProfileModal(true);

    setTimeout(() => {
      const canvas = sigCanvasRef.current;
      if (canvas && doctorData.signatureData) {
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = doctorData.signatureData;
      } else {
        clearCanvas(sigCanvasRef);
      }
    }, 150);
  }

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function addSlotToList() {
    if (!slotStart || !slotEnd) {
      toast("Please select start and end times", "warning");
      return;
    }
    if (slotStart >= slotEnd) {
      toast("End time must be after start time", "warning");
      return;
    }
    setTempSlots((s) => [...s, { day: slotDay, startTime: slotStart, endTime: slotEnd }]);
  }

  function removeSlotFromList(idx) {
    setTempSlots((s) => s.filter((_, i) => i !== idx));
  }

  async function handleProfileSubmit(e) {
    e.preventDefault();
    if (!doctorData) return;

    let signatureData = doctorData.signatureData || null;
    if (sigCanvasRef.current && !isCanvasBlank(sigCanvasRef)) {
      signatureData = sigCanvasRef.current.toDataURL();
    }

    const body = {
      ...doctorData,
      firstName: profileForm.firstName,
      lastName: profileForm.lastName,
      specialization: profileForm.specialization,
      phone: profileForm.phone,
      consultationFee: parseFloat(profileForm.fee) || 0,
      yearsOfExperience: parseInt(profileForm.experience, 10) || 0,
      biography: profileForm.biography,
      avatarData: avatarPreview?.startsWith("data:") ? avatarPreview : doctorData.avatarData || null,
      signatureData,
      availableSlots: JSON.stringify(tempSlots),
    };

    setSavingProfile(true);
    try {
      const res = await api.updateDoctor(doctorData.id, body);
      setDoctorData(res);
      toast("Profile updated successfully!", "success");
      setShowProfileModal(false);
    } catch {
      toast("Failed to update profile", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  if (!ready) return null;

  const avatarInitials = doctorData ? initials(doctorData.firstName, doctorData.lastName) : "DR";
  const fullName = doctorData ? `Dr. ${doctorData.firstName} ${doctorData.lastName}` : "Loading Profile...";

  return (
    <>
      <DoctorSidebar active="dashboard" doctor={doctorData} />

      <div className="main">
        <div className="topbar">
          <div className="page-title">Doctor Dashboard</div>
          <div className="topbar-right">
            <TopbarActions />
            <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--muted)" }}>{currentDateLong()}</span>
          </div>
        </div>

        <div className="content" style={{ padding: "32px" }}>
          <div className="profile-header" style={{ justifyContent: "space-between", display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
              <div
                className="profile-avatar"
                style={{
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  background: "var(--teal)",
                  fontSize: "32px",
                  fontWeight: "700",
                  color: "var(--white)",
                }}
              >
                {doctorData?.avatarData ? (
                  <img src={doctorData.avatarData} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  avatarInitials
                )}
              </div>
              <div className="profile-info">
                <h2>{fullName}</h2>
                {doctorData && (
                  <>
                    <p>
                      <strong>Department:</strong> {doctorData.departmentName || "General"} | <strong>Specialization:</strong>{" "}
                      {doctorData.specialization || "Not Specified"}
                    </p>
                    <p>
                      <strong>Consultation Fee:</strong> ৳{doctorData.consultationFee || "0"} | <strong>Available Days:</strong>{" "}
                      {doctorData.availableDays || "Unknown"}
                    </p>
                  </>
                )}
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={openProfileModal}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 18px",
                borderRadius: "8px",
                background: "var(--teal)",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontWeight: "600",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                edit
              </span>{" "}
              Edit Profile
            </button>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-title">Appointments Today</div>
              <div className="stat-value">{stats.today}</div>
            </div>
            <div className="stat-card">
              <div className="stat-title">Pending Appointments</div>
              <div className="stat-value">{stats.pending}</div>
            </div>
            <div className="stat-card">
              <div className="stat-title">Total Assigned Patients</div>
              <div className="stat-value">{stats.patients}</div>
            </div>
          </div>

          {(doctorData?.biography || doctorData?.signatureData) && (
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", marginBottom: "24px" }}>
              {doctorData?.biography && (
                <div className="table-container" style={{ marginBottom: "0" }}>
                  <div className="table-title" style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="material-symbols-outlined" style={{ color: "var(--teal)", fontSize: "20px" }}>
                      menu_book
                    </span>{" "}
                    About Me
                  </div>
                  <div style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--slate)", fontStyle: "italic", whiteSpace: "pre-wrap" }}>
                    {doctorData.biography}
                  </div>
                </div>
              )}
              {doctorData?.signatureData && (
                <div className="table-container" style={{ marginBottom: "0" }}>
                  <div className="table-title" style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="material-symbols-outlined" style={{ color: "var(--teal)", fontSize: "20px" }}>
                      draw
                    </span>{" "}
                    Digital Signature
                  </div>
                  <div style={{ textAlign: "center", border: "1px dashed var(--border)", padding: "8px", borderRadius: "8px", background: "#fafafa" }}>
                    <img src={doctorData.signatureData} style={{ maxHeight: "80px", objectFit: "contain", maxWidth: "100%" }} />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="table-container" style={{ background: "linear-gradient(135deg, #f2f7f9 0%, #e8f4f4 100%)", marginBottom: "24px" }}>
            <div className="table-header">
              <div className="table-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--teal)", fontSize: "20px" }}>
                  mic
                </span>{" "}
                Smart Clinical Notes (Voice Dictation)
              </div>
              <button
                className="btn btn-primary"
                onClick={handleToggleDictation}
                style={{
                  background: dictation.isDictating ? "var(--danger)" : "var(--teal)",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                {dictation.isDictating ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: "16px", marginRight: "4px", verticalAlign: "text-bottom" }}>
                      stop
                    </span>{" "}
                    Stop Dictation
                  </>
                ) : (
                  "Start Dictation"
                )}
              </button>
            </div>
            <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--navy)", whiteSpace: "nowrap" }}>Patient Profile:</label>
              <select
                value={dictationPatientId}
                onChange={(e) => setDictationPatientId(e.target.value)}
                style={{
                  flex: "1",
                  background: "var(--white)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "13px",
                  color: "var(--navy)",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="" disabled>
                  {patients.length === 0 ? "No patients assigned" : "Select Patient"}
                </option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} ({p.patientCode || "No Code"})
                  </option>
                ))}
              </select>
            </div>
            <textarea
              className="form-input"
              rows="5"
              placeholder="Click 'Start Dictation' and begin speaking your diagnosis..."
              value={dictationText}
              onChange={(e) => setDictationText(e.target.value)}
              style={{ width: "100%", resize: "vertical", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px", fontFamily: "'DM Sans', sans-serif" }}
            ></textarea>
          </div>

          <div
            className="table-container"
            style={{ background: "linear-gradient(135deg, #fdfbf7 0%, #f5eedf 100%)", marginBottom: "24px", borderLeft: "4px solid var(--warning)" }}
          >
            <div className="table-header">
              <div className="table-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--warning)", fontSize: "20px" }}>
                  description
                </span>{" "}
                E-Prescription &amp; Medicine Dictator
              </div>
            </div>

            <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--navy)", whiteSpace: "nowrap" }}>Prescribe to Patient:</label>
              <select
                value={prescPatientId}
                onChange={(e) => setPrescPatientId(e.target.value)}
                style={{
                  flex: "1",
                  background: "var(--white)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "13px",
                  color: "var(--navy)",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="" disabled>
                  {patients.length === 0 ? "No patients assigned" : "Select Patient"}
                </option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} ({p.patientCode || "No Code"})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--navy)", display: "block", marginBottom: "6px" }}>
                Diagnosis &amp; Clinical Observations
              </label>
              <textarea
                rows="2"
                className="form-input"
                placeholder="Enter patient diagnosis..."
                value={prescDiagnosis}
                onChange={(e) => setPrescDiagnosis(e.target.value)}
                style={{ width: "100%", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px", fontFamily: "'DM Sans', sans-serif", resize: "vertical" }}
              ></textarea>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--navy)" }}>Medications &amp; Dosage</label>
                <button
                  className="btn"
                  onClick={handleToggleMedDictation}
                  style={{
                    fontSize: "11px",
                    padding: "4px 10px",
                    background: medDictation.isDictating ? "var(--danger)" : "var(--warning)",
                    color: medDictation.isDictating ? "white" : "var(--navy)",
                    border: "none",
                    borderRadius: "4px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                    {medDictation.isDictating ? "stop" : "mic"}
                  </span>{" "}
                  {medDictation.isDictating ? "Stop Dictating" : "Dictate Meds"}
                </button>
              </div>
              <textarea
                rows="3"
                className="form-input"
                placeholder={"e.g. Paracetamol 500mg - 1+0+1 after meal, 5 days\nAmoxicillin 250mg - 1+1+1 before meal, 7 days"}
                value={prescMeds}
                onChange={(e) => setPrescMeds(e.target.value)}
                style={{ width: "100%", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px", fontFamily: "'DM Sans', sans-serif", resize: "vertical" }}
              ></textarea>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <input
                  type="checkbox"
                  checked={enableHandwritten}
                  onChange={(e) => setEnableHandwritten(e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--navy)", cursor: "pointer" }}>
                  Include Handwritten Prescription notes / sketch
                </label>
              </div>
              {enableHandwritten && (
                <div style={{ border: "1px solid var(--border)", borderRadius: "8px", background: "white", padding: "8px" }}>
                  <canvas
                    ref={handwrittenCanvasRef}
                    width="600"
                    height="200"
                    style={{ width: "100%", height: "200px", border: "1px dashed #ccc", cursor: "crosshair", background: "#fafafa" }}
                  ></canvas>
                  <div style={{ textAlign: "right", marginTop: "6px" }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => clearCanvas(handwrittenCanvasRef)}
                      style={{ padding: "4px 10px", fontSize: "11px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Clear Canvas
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ textAlign: "right", marginTop: "16px" }}>
              <button className="btn btn-outline" onClick={resetPrescriptionForm} style={{ padding: "8px 16px", fontSize: "12px" }}>
                Clear All
              </button>
              <button
                className="btn btn-primary"
                onClick={generateAndSavePrescription}
                disabled={savingPrescription}
                style={{ padding: "8px 18px", fontSize: "12px", marginLeft: "8px", background: "var(--teal)", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: "600" }}
              >
                {savingPrescription ? "Generating..." : "Save & Print Prescription"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={"modal-overlay" + (showProfileModal ? " show" : "")}>
        <div className="modal" style={{ maxWidth: "600px" }}>
          <div className="modal-header">
            <div className="modal-title">Edit Profile</div>
            <button className="modal-close" onClick={() => setShowProfileModal(false)}>
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                close
              </span>
            </button>
          </div>
          <div className="modal-body" style={{ maxHeight: "80vh", overflowY: "auto", padding: "20px" }}>
            {profileForm && (
              <form onSubmit={handleProfileSubmit}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--navy)", display: "block", marginBottom: "4px" }}>First Name</label>
                    <input
                      type="text"
                      required
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))}
                      style={{ width: "100%", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px" }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--navy)", display: "block", marginBottom: "4px" }}>Last Name</label>
                    <input
                      type="text"
                      required
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))}
                      style={{ width: "100%", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
                  <div className="form-group">
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--navy)", display: "block", marginBottom: "4px" }}>Specialization</label>
                    <input
                      type="text"
                      required
                      value={profileForm.specialization}
                      onChange={(e) => setProfileForm((f) => ({ ...f, specialization: e.target.value }))}
                      style={{ width: "100%", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px" }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--navy)", display: "block", marginBottom: "4px" }}>Phone</label>
                    <input
                      type="text"
                      required
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                      style={{ width: "100%", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
                  <div className="form-group">
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--navy)", display: "block", marginBottom: "4px" }}>Consultation Fee (৳)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={profileForm.fee}
                      onChange={(e) => setProfileForm((f) => ({ ...f, fee: e.target.value }))}
                      style={{ width: "100%", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px" }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--navy)", display: "block", marginBottom: "4px" }}>Years of Experience</label>
                    <input
                      type="number"
                      min="0"
                      value={profileForm.experience}
                      onChange={(e) => setProfileForm((f) => ({ ...f, experience: e.target.value }))}
                      style={{ width: "100%", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px" }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: "12px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--navy)", display: "block", marginBottom: "4px" }}>Profile Photo (Avatar)</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {avatarPreview && (
                      <img
                        src={avatarPreview}
                        style={{ width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)", background: "#eee" }}
                      />
                    )}
                    <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ fontSize: "13px" }} />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: "12px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--navy)", display: "block", marginBottom: "4px" }}>Biography / About Me</label>
                  <textarea
                    rows="3"
                    placeholder="Brief details about your experience, expertise, etc."
                    value={profileForm.biography}
                    onChange={(e) => setProfileForm((f) => ({ ...f, biography: e.target.value }))}
                    style={{ width: "100%", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", resize: "vertical" }}
                  ></textarea>
                </div>

                <div className="form-group" style={{ marginTop: "12px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--navy)", display: "block", marginBottom: "4px" }}>Draw Digital Signature</label>
                  <div style={{ border: "1px solid var(--border)", borderRadius: "8px", background: "white", padding: "8px", position: "relative" }}>
                    <canvas
                      ref={sigCanvasRef}
                      width="500"
                      height="120"
                      style={{ width: "100%", height: "120px", border: "1px dashed #ccc", cursor: "crosshair", background: "#fafafa" }}
                    ></canvas>
                    <div style={{ textAlign: "right", marginTop: "6px" }}>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => clearCanvas(sigCanvasRef)}
                        style={{ padding: "4px 10px", fontSize: "11px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "4px", cursor: "pointer" }}
                      >
                        Clear Canvas
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: "12px", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px", background: "rgba(0,0,0,0.01)" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--navy)", display: "block", marginBottom: "4px" }}>Manage Shift Timing Slots</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px", marginBottom: "12px" }}>
                    {tempSlots.map((s, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 10px",
                          background: "rgba(10,124,124,0.1)",
                          color: "var(--teal)",
                          borderRadius: "20px",
                          fontSize: "11px",
                          fontWeight: "600",
                        }}
                      >
                        {s.day} {s.startTime}-{s.endTime}
                        <span
                          className="material-symbols-outlined"
                          onClick={() => removeSlotFromList(idx)}
                          style={{ fontSize: "14px", cursor: "pointer", color: "var(--danger)" }}
                        >
                          close
                        </span>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                    <div style={{ flex: "1" }}>
                      <label style={{ fontSize: "10px", color: "var(--muted)", display: "block", marginBottom: "2px" }}>Day</label>
                      <select
                        value={slotDay}
                        onChange={(e) => setSlotDay(e.target.value)}
                        style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid var(--border)", fontFamily: "'DM Sans', sans-serif", fontSize: "12px" }}
                      >
                        {WEEKDAYS.map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: "1" }}>
                      <label style={{ fontSize: "10px", color: "var(--muted)", display: "block", marginBottom: "2px" }}>Start Time</label>
                      <input
                        type="time"
                        value={slotStart}
                        onChange={(e) => setSlotStart(e.target.value)}
                        style={{ width: "100%", padding: "5px", borderRadius: "4px", border: "1px solid var(--border)", fontFamily: "'DM Sans', sans-serif", fontSize: "12px" }}
                      />
                    </div>
                    <div style={{ flex: "1" }}>
                      <label style={{ fontSize: "10px", color: "var(--muted)", display: "block", marginBottom: "2px" }}>End Time</label>
                      <input
                        type="time"
                        value={slotEnd}
                        onChange={(e) => setSlotEnd(e.target.value)}
                        style={{ width: "100%", padding: "5px", borderRadius: "4px", border: "1px solid var(--border)", fontFamily: "'DM Sans', sans-serif", fontSize: "12px" }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addSlotToList}
                      style={{ padding: "6px 12px", background: "var(--teal)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "600", fontSize: "12px" }}
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="modal-footer" style={{ marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "12px", textAlign: "right" }}>
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    style={{ padding: "8px 16px", border: "1px solid var(--border)", background: "var(--bg)", borderRadius: "8px", cursor: "pointer", marginRight: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "12px" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    style={{ padding: "8px 16px", background: "var(--teal)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontFamily: "'DM Sans', sans-serif", fontSize: "12px" }}
                  >
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
