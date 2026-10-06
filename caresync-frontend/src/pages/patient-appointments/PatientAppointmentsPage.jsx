import { useEffect, useMemo, useState } from "react";
import PatientSidebar from "../../components/PatientSidebar.jsx";
import { api } from "../../lib/api";
import { useAuthGuard } from "../../lib/useAuthGuard";
import { useMyPatient } from "../../lib/useMyPatient";
import { useToast } from "../../lib/Toast.jsx";
import { currentDateLong, formatTime, todayISO } from "../../lib/ui";
import { dayName, describeSchedule, hasSchedule, isWithinSchedule, timeOptionsForDate } from "../../lib/schedule";
import TopbarActions from "../../components/TopbarActions.jsx";

function emptyBookForm() {
  return { deptId: "", doctorId: "", date: "", time: "", type: "Consultation", reason: "" };
}

export default function PatientAppointmentsPage() {
  const { ready } = useAuthGuard("PATIENT");
  const { patient, loading: patientLoading } = useMyPatient();
  const toast = useToast();

  const [appointments, setAppointments] = useState([]);
  const [tab, setTab] = useState("upcoming");

  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookForm, setBookForm] = useState(emptyBookForm());
  const [booking, setBooking] = useState(false);

  async function loadAppointments() {
    if (!patient) return;
    try {
      const res = await api.getAppointments();
      const mine = (res || [])
        .filter((a) => a.patientId === patient.id)
        .sort((a, b) => {
          const aDate = new Date(`${a.appointmentDate}T${a.appointmentTime || "00:00:00"}`);
          const bDate = new Date(`${b.appointmentDate}T${b.appointmentTime || "00:00:00"}`);
          return aDate - bDate;
        });
      setAppointments(mine);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    if (!ready || patientLoading || !patient) return;
    loadAppointments();
    api.getDepartments().then(setDepartments).catch(() => {});
    api.getDoctors().then(setDoctors).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, patientLoading, patient]);

  const buckets = useMemo(() => {
    const now = new Date();
    const upcoming = appointments.filter(
      (a) => new Date(`${a.appointmentDate}T${a.appointmentTime || "00:00:00"}`) >= now,
    );
    const past = appointments.filter((a) => !upcoming.includes(a));
    return {
      upcoming,
      past,
      confirmed: appointments.filter((a) => a.status === "Confirmed").length,
      pending: appointments.filter((a) => a.status === "Pending").length,
    };
  }, [appointments]);

  const visible = tab === "upcoming" ? buckets.upcoming : buckets.past;

  const filteredDoctors = useMemo(
    () => doctors.filter((d) => String(d.departmentId) === String(bookForm.deptId) && d.isAvailable),
    [doctors, bookForm.deptId],
  );
  const selectedDoctor = useMemo(() => doctors.find((d) => String(d.id) === String(bookForm.doctorId)), [doctors, bookForm.doctorId]);

  // Booking rule: doctor has a schedule -> time must match it; no schedule -> any time.
  const scheduled = useMemo(() => hasSchedule(selectedDoctor?.availableSlots), [selectedDoctor]);

  const timeOptions = useMemo(
    () => (scheduled ? timeOptionsForDate(selectedDoctor.availableSlots, bookForm.date) : []),
    [scheduled, selectedDoctor, bookForm.date],
  );

  const availabilityInfo = useMemo(() => {
    if (!selectedDoctor) return "";
    if (scheduled) return "Available Slots: " + describeSchedule(selectedDoctor.availableSlots);
    const days = selectedDoctor.availableDays ? `Available Days: ${selectedDoctor.availableDays}. ` : "";
    return days + "No fixed schedule, you can choose any time.";
  }, [selectedDoctor, scheduled]);

  const dayOffMessage =
    scheduled && bookForm.date && timeOptions.length === 0
      ? `${selectedDoctor.firstName} ${selectedDoctor.lastName} does not see patients on ${dayName(bookForm.date)}. Please pick another date.`
      : "";

  function setField(name, value) {
    // a different doctor or date means the previously picked time may no longer be valid
    const resetsTime = name === "doctorId" || name === "date";
    setBookForm((f) => ({ ...f, [name]: value, ...(resetsTime ? { time: "" } : {}) }));
  }

  function handleDeptChange(deptId) {
    setBookForm((f) => ({ ...f, deptId, doctorId: "", time: "" }));
  }

  function openBookModal() {
    setBookForm(emptyBookForm());
    setShowBookModal(true);
  }

  async function handleBookSubmit(e) {
    e.preventDefault();
    if (!patient) {
      toast("Patient profile not loaded yet", "warning");
      return;
    }
    if (!isWithinSchedule(selectedDoctor?.availableSlots, bookForm.date, bookForm.time)) {
      toast(
        `The selected time is outside the doctor's schedule. ${describeSchedule(selectedDoctor?.availableSlots)}`,
        "warning",
      );
      return;
    }
    const payload = {
      patientId: patient.id,
      doctorId: parseInt(bookForm.doctorId, 10),
      appointmentDate: bookForm.date,
      appointmentTime: bookForm.time + ":00",
      appointmentType: bookForm.type,
      reason: bookForm.reason.trim() || null, // optional
      status: "Pending",
    };

    setBooking(true);
    try {
      await api.createAppointment(payload);
      setShowBookModal(false);
      toast("Appointment booked successfully!", "success");
      await loadAppointments();
    } catch (e) {
      toast(e.message || "Failed to book appointment", "error");
    } finally {
      setBooking(false);
    }
  }

  if (!ready) return null;

  return (
    <>
      <PatientSidebar active="appointments" patient={patient} />

      <div className="main">
        <div className="topbar">
          <div className="page-title">My Appointments</div>
          <div className="topbar-right">
            <TopbarActions />
            <button
              className="btn-primary"
              onClick={openBookModal}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "white" }}>
                add_circle
              </span>{" "}
              Book Appointment
            </button>
            <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--muted)" }}>{currentDateLong()}</span>
          </div>
        </div>

        <div className="content" style={{ padding: "32px" }}>
          <div className="summary-bar">
            <div className="summary-card">
              <div className="summary-icon" style={{ background: "rgba(10, 124, 124, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--teal)", fontSize: "22px" }}>
                  calendar_today
                </span>
              </div>
              <div>
                <div className="summary-num">{appointments.length}</div>
                <div className="summary-label">Total Appointments</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon" style={{ background: "rgba(26, 171, 109, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--success)", fontSize: "22px" }}>
                  check_circle
                </span>
              </div>
              <div>
                <div className="summary-num">{buckets.confirmed}</div>
                <div className="summary-label">Confirmed</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon" style={{ background: "rgba(245, 166, 35, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--warning)", fontSize: "22px" }}>
                  schedule
                </span>
              </div>
              <div>
                <div className="summary-num">{buckets.pending}</div>
                <div className="summary-label">Pending</div>
              </div>
            </div>
          </div>

          <div className="tabs">
            <button className={"tab-btn" + (tab === "upcoming" ? " active" : "")} onClick={() => setTab("upcoming")}>
              Upcoming <span className="tab-count">{buckets.upcoming.length}</span>
            </button>
            <button className={"tab-btn" + (tab === "past" ? " active" : "")} onClick={() => setTab("past")}>
              Past <span className="tab-count">{buckets.past.length}</span>
            </button>
          </div>

          <div className="appt-cards">
            {visible.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: "48px" }}>
                    calendar_today
                  </span>
                </div>
                <div className="empty-state-title">No {tab} appointments</div>
                <div className="empty-state-desc">
                  {tab === "upcoming" ? "You don't have any upcoming appointments scheduled." : "No past appointment records found."}
                </div>
              </div>
            )}
            {visible.map((a, i) => {
              const d = new Date(a.appointmentDate);
              const day = d.getDate();
              const month = d.toLocaleDateString("en-US", { month: "short" });
              const statusClass = (a.status || "pending").toLowerCase();
              return (
                <div className="appt-card" key={a.id} style={{ animationDelay: i * 0.06 + "s" }}>
                  <div className="appt-card-date">
                    <div className="appt-card-day">{day}</div>
                    <div className="appt-card-month">{month}</div>
                  </div>
                  <div className="appt-card-info">
                    <div className="appt-card-doctor">{a.doctorName || "Doctor"}</div>
                    <div className="appt-card-meta">
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                          schedule
                        </span>{" "}
                        {formatTime(a.appointmentTime)}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                          assignment
                        </span>{" "}
                        {a.appointmentType || "Consultation"}
                      </span>
                      {a.reason && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                            chat
                          </span>{" "}
                          {a.reason}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="appt-card-status">
                    <span className={"badge " + statusClass}>{a.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={"modal-overlay" + (showBookModal ? " show" : "")}>
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title">Book Appointment</div>
            <button className="modal-close" onClick={() => setShowBookModal(false)}>
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                close
              </span>
            </button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleBookSubmit}>
              <div className="form-group">
                <label htmlFor="book-department">Department</label>
                <select id="book-department" required value={bookForm.deptId} onChange={(e) => handleDeptChange(e.target.value)}>
                  <option value="" disabled>
                    Select Department
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.departmentName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="book-doctor">Doctor</label>
                <select
                  id="book-doctor"
                  required
                  value={bookForm.doctorId}
                  onChange={(e) => setField("doctorId", e.target.value)}
                  disabled={!bookForm.deptId}
                >
                  <option value="" disabled>
                    Select Doctor
                  </option>
                  {filteredDoctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.firstName} {d.lastName} ({d.specialization})
                    </option>
                  ))}
                </select>
                {availabilityInfo && (
                  <div style={{ fontSize: "12px", color: "var(--teal)", marginTop: "6px", fontWeight: "500" }}>{availabilityInfo}</div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label htmlFor="book-date">Date</label>
                  <input id="book-date" type="date" required min={todayISO()} value={bookForm.date} onChange={(e) => setField("date", e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="book-time">Time</label>
                  {scheduled ? (
                    <select
                      id="book-time"
                      required
                      value={bookForm.time}
                      disabled={!bookForm.date || timeOptions.length === 0}
                      onChange={(e) => setField("time", e.target.value)}
                    >
                      <option value="" disabled>
                        {bookForm.date ? "Select a time" : "Pick a date first"}
                      </option>
                      {timeOptions.map((t) => (
                        <option key={t} value={t}>
                          {formatTime(t)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input id="book-time" type="time" required value={bookForm.time} onChange={(e) => setField("time", e.target.value)} />
                  )}
                </div>
              </div>

              {dayOffMessage && (
                <div role="alert" style={{ fontSize: "12px", color: "var(--danger, #d64545)", margin: "-4px 0 12px", fontWeight: "500" }}>
                  {dayOffMessage}
                </div>
              )}

              <div className="form-group">
                <label>Appointment Type</label>
                <select required value={bookForm.type} onChange={(e) => setField("type", e.target.value)}>
                  <option value="Consultation">Consultation</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Regular Checkup">Regular Checkup</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>

              <div className="form-group">
                <label>Reason / Symptoms (optional)</label>
                <textarea
                  rows="3"
                  placeholder="Brief description of symptoms or consultation reason (optional)"
                  value={bookForm.reason}
                  onChange={(e) => setField("reason", e.target.value)}
                ></textarea>
              </div>

              <div className="fee-display">
                <span>Consultation Fee:</span>
                <span>৳{selectedDoctor ? parseFloat(selectedDoctor.consultationFee || 0).toFixed(2) : "0.00"}</span>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowBookModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={booking}>
                  {booking ? "Booking..." : "Book Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
