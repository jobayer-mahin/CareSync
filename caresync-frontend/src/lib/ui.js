/**
 * Shared helpers ported from the original caresync-ui.js — formatting,
 * badge classes, name utilities. The DOM-manipulation helpers from that
 * file (openModal/closeModal/val/setVal/loadSelect) are gone: modals are
 * now conditional JSX and forms are controlled React state.
 */

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))
    ? new Date(`${dateStr}T00:00:00`)
    : new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(timeStr) {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${m} ${ampm}`;
}

export function initials(firstName, lastName) {
  const a = (firstName || "").charAt(0).toUpperCase();
  const b = (lastName || "").charAt(0).toUpperCase();
  return a + b || "?";
}

export function ageFromDob(dob) {
  if (!dob) return "—";
  const d = new Date(dob);
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export function splitName(fullName) {
  const parts = (fullName || "").trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "." };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function dobFromAge(age) {
  const year = new Date().getFullYear() - age;
  return `${year}-01-01`;
}

export function deptCodeFromName(name) {
  return (name || "")
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase())
    .join("")
    .slice(0, 4);
}

export function statusBadgeClass(status) {
  const s = (status || "").toLowerCase();
  if (s === "active") return "active-badge";
  if (s === "critical") return "critical-badge";
  if (s === "admitted") return "admitted-badge";
  if (s === "discharged") return "discharged-badge";
  return "active-badge";
}

export function appointmentStatusClass(status) {
  const m = {
    Pending: "pending-badge",
    Confirmed: "confirmed-badge",
    Cancelled: "cancelled-badge",
    Completed: "confirmed-badge",
  };
  return m[status] || "pending-badge";
}

export function paymentBadgeClass(status) {
  if (status === "Paid") return "paid-badge";
  if (status === "Partial") return "partial-badge";
  return "unpaid-badge";
}

export function todayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function currentDateLong() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getDeptVisuals(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("cardio")) return { icon: "favorite", bg: "rgba(224, 82, 82, 0.1)", color: "#e05252" };
  if (n.includes("emerg")) return { icon: "emergency", bg: "rgba(224, 82, 82, 0.1)", color: "#e05252" };
  if (n.includes("ortho")) return { icon: "healing", bg: "rgba(26, 171, 109, 0.1)", color: "#1aab6d" };
  if (n.includes("neuro")) return { icon: "psychology", bg: "rgba(124, 92, 191, 0.1)", color: "#7c5cbf" };
  if (n.includes("pediat")) return { icon: "child_care", bg: "rgba(245, 166, 35, 0.1)", color: "#f5a623" };
  if (n.includes("gyneco")) return { icon: "female", bg: "rgba(10, 124, 124, 0.1)", color: "#0a7c7c" };
  return { icon: "local_hospital", bg: "rgba(10, 124, 124, 0.1)", color: "#0a7c7c" };
}

export function formatFloor(floor) {
  if (floor === undefined || floor === null) return "—";
  if (floor === 0) return "G";
  const lastDigit = floor % 10;
  if (lastDigit === 1) return floor + "st";
  if (lastDigit === 2) return floor + "nd";
  if (lastDigit === 3) return floor + "rd";
  return floor + "th";
}

export function guessDocCategory(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("lab") || n.includes("blood") || n.includes("test") || n.includes("report"))
    return "lab";
  if (
    n.includes("xray") ||
    n.includes("x-ray") ||
    n.includes("mri") ||
    n.includes("ct") ||
    n.includes("scan") ||
    n.includes("ultrasound")
  )
    return "imaging";
  if (n.includes("rx") || n.includes("prescription") || n.includes("medicine"))
    return "prescription";
  return "general";
}

export function fileIconFor(name) {
  const n = (name || "").toLowerCase();
  if (n.endsWith(".pdf")) return { icon: "picture_as_pdf", cls: "pdf" };
  if (n.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) return { icon: "image", cls: "image" };
  return { icon: "description", cls: "other" };
}

let loaderPromises = {};
/** Dynamically load a third-party UMD script (Chart.js, html2pdf, QRCode, html5-qrcode) once. */
export function loadExternalScript(src) {
  if (loaderPromises[src]) return loaderPromises[src];
  loaderPromises[src] = new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load " + src));
    document.body.appendChild(script);
  });
  return loaderPromises[src];
}
