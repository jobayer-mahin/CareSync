/**
 * CareSync HMS — API client (ES module)
 * Talks directly to the Spring Boot backend. No PHP, no globals.
 */
const API_BASE =
  (typeof window !== "undefined" && window.__CARESYNC_API_BASE__) ||
  "http://localhost:3000/api";

function getToken() {
  return sessionStorage.getItem("caresync_token") || "";
}

export function setSession(data) {
  if (data.token) sessionStorage.setItem("caresync_token", data.token);
  if (data.email) sessionStorage.setItem("caresync_email", data.email);
  if (data.role) sessionStorage.setItem("caresync_role", data.role);
  if (data.userId) sessionStorage.setItem("caresync_user_id", data.userId);
}

export function clearSession() {
  ["caresync_token", "caresync_email", "caresync_role", "caresync_user_id"].forEach(
    (k) => sessionStorage.removeItem(k),
  );
}

export function getSession() {
  return {
    token: getToken(),
    email: sessionStorage.getItem("caresync_email") || "",
    role: sessionStorage.getItem("caresync_role") || "",
    userId: sessionStorage.getItem("caresync_user_id") || "",
  };
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = "Bearer " + token;

  let res;
  try {
    res = await fetch(API_BASE + path, { ...options, headers });
  } catch {
    throw new Error(
      "Cannot reach backend at " +
        API_BASE +
        ". Is the Spring Boot app running (mvn spring-boot:run)?",
    );
  }

  if (res.status === 204) return null;

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    // Validation errors come back as { messages: { field: "text" } }
    const fieldMessages =
      data && data.messages && typeof data.messages === "object"
        ? Object.values(data.messages).join(", ")
        : "";
    const msg =
      (data && (data.message || fieldMessages || data.error)) || `Request failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

const get = (path) => request(path, { method: "GET" });
const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body ?? {}) });
const put = (path, body) => request(path, { method: "PUT", body: JSON.stringify(body ?? {}) });
const del = (path) => request(path, { method: "DELETE" });

export const api = {
  // Auth
  login: (identifier, password, role) =>
    post("/auth/login", { identifier, password, role: role ? role.toUpperCase() : "" }),
  forgotPassword: (identifier, phone, newPassword) =>
    post("/auth/forgot-password", { identifier, phone, newPassword }),
  getCurrentUser: () => get("/auth/me"),
  analyzeSymptoms: (symptoms) => post("/symptoms/analyze", { symptoms }),

  // Dashboard
  getDashboardStats: () => get("/dashboard/stats"),
  getDashboardRecentPatients: () => get("/dashboard/recent-patients"),
  getDashboardTodayAppointments: () => get("/dashboard/appointments-today"),

  // Patients
  getPatients: () => get("/patients"),
  searchPatients: (name) => get("/patients/search?name=" + encodeURIComponent(name)),
  getPatientsByStatus: (status) => get("/patients/status/" + encodeURIComponent(status)),
  getPatient: (id) => get("/patients/" + id),
  createPatient: (body) => post("/patients", body),
  updatePatient: (id, body) => put("/patients/" + id, body),
  deletePatient: (id) => del("/patients/" + id),
  qrCheckIn: (qrText) => post("/patients/qr-checkin", { qrText }),

  // Doctors
  getDoctors: () => get("/doctors"),
  searchDoctors: (name) => get("/doctors/search?name=" + encodeURIComponent(name)),
  getDoctor: (id) => get("/doctors/" + id),
  createDoctor: (body) => post("/doctors", body),
  updateDoctor: (id, body) => put("/doctors/" + id, body),
  deleteDoctor: (id) => del("/doctors/" + id),
  getDoctorsByDepartment: (deptId) => get("/doctors/department/" + deptId),

  // Departments
  getDepartments: () => get("/departments"),
  getDepartment: (id) => get("/departments/" + id),
  createDepartment: (body) => post("/departments", body),
  updateDepartment: (id, body) => put("/departments/" + id, body),
  deleteDepartment: (id) => del("/departments/" + id),

  // Appointments
  getAppointments: () => get("/appointments"),
  getAppointment: (id) => get("/appointments/" + id),
  createAppointment: (body) => post("/appointments", body),
  updateAppointment: (id, body) => put("/appointments/" + id, body),
  deleteAppointment: (id) => del("/appointments/" + id),
  getAppointmentsByPatient: (patientId) => get("/appointments/patient/" + patientId),
  getAppointmentsByDoctor: (doctorId) => get("/appointments/doctor/" + doctorId),
  getTodayAppointments: () => get("/appointments/today"),

  // Emergency
  getEmergencyCases: () => get("/emergency"),
  getEmergencyCase: (id) => get("/emergency/" + id),
  createEmergencyCase: (body) => post("/emergency", body),
  updateEmergencyCase: (id, body) => put("/emergency/" + id, body),
  getActiveEmergencyCases: () => get("/emergency/active"),
  getEmergencyCasesByPriority: (level) => get("/emergency/priority/" + level),
  admitEmergencyCase: (id) => post("/emergency/" + id + "/admit"),
  declineEmergencyCase: (id) => post("/emergency/" + id + "/decline"),

  // Invoices / Billing
  getInvoices: () => get("/invoices"),
  getInvoice: (id) => get("/invoices/" + id),
  createInvoice: (body) => post("/invoices", body),
  updateInvoice: (id, body) => put("/invoices/" + id, body),
  deleteInvoice: (id) => del("/invoices/" + id),
  getInvoicesByPatient: (patientId) => get("/invoices/patient/" + patientId),
  getUnpaidInvoices: () => get("/invoices/unpaid"),
  recordPayment: (id, amount) => post(`/invoices/${id}/pay`, { amount }),

  // Bed rates (in-patient bed prices, editable by admin)
  getBedRates: () => get("/bed-rates"),
  updateBedRates: (rates) => put("/bed-rates", rates),

  // Notifications & chat
  getNotifications: () => get("/notifications"),
  markNotificationRead: (id) => post(`/notifications/${id}/read`),
  markAllNotificationsRead: () => post("/notifications/read-all"),
  getChatContacts: () => get("/messages/contacts"),
  getConversation: (userId) => get("/messages/conversation/" + userId),
  sendMessage: (receiverId, content) => post("/messages", { receiverId, content }),
  getUnreadMessageCount: () => get("/messages/unread-count"),

  // EHR documents
  getEhrDocuments: (patientId) => get("/ehr-documents/patient/" + patientId),
  createEhrDocument: (body) => post("/ehr-documents", body),
  deleteEhrDocument: (id) => del("/ehr-documents/" + id),
};
