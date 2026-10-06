/**
 * Doctor schedule helpers (mirror of the backend rule in DoctorSchedule.java).
 *
 * A doctor's schedule is stored as JSON text in `availableSlots`:
 *   [{"day":"Sunday","startTime":"09:00","endTime":"12:00"}, ...]
 *
 * Booking rule:
 *   - doctor HAS at least one valid slot -> the time must be inside a slot for that weekday
 *     (start inclusive, end exclusive)
 *   - doctor has NO schedule            -> any time is allowed
 */

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function titleCase(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function dayIndex(name) {
  if (typeof name !== "string") return -1;
  const t = name.trim().toLowerCase();
  if (t.length < 3) return -1;
  return DAY_NAMES.findIndex((d) => d.startsWith(t));
}

/** "09:30" or "09:30:00" -> minutes since midnight, or null when invalid. */
export function toMinutes(time) {
  if (typeof time !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(time.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function fromMinutes(total) {
  const h = String(Math.floor(total / 60)).padStart(2, "0");
  const m = String(total % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/** Weekday (0 = Sunday) of a "YYYY-MM-DD" string, using local time. Returns -1 when invalid. */
export function weekdayOf(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
  if (!m) return -1;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? -1 : d.getDay();
}

/** Parses the stored JSON. Bad JSON or bad entries are ignored; never throws. */
export function parseSlots(json) {
  if (!json || typeof json !== "string") return [];
  let raw;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const slots = [];
  for (const s of raw) {
    const day = dayIndex(s && s.day);
    const start = toMinutes(s && s.startTime);
    const end = toMinutes(s && s.endTime);
    if (day >= 0 && start !== null && end !== null && start < end) {
      slots.push({ day, start, end });
    }
  }
  return slots;
}

export function hasSchedule(json) {
  return parseSlots(json).length > 0;
}

/** The rule: no schedule -> true; otherwise date + time must sit inside a slot. */
export function isWithinSchedule(json, dateStr, timeStr) {
  const slots = parseSlots(json);
  if (slots.length === 0) return true;
  const day = weekdayOf(dateStr);
  const t = toMinutes(timeStr);
  if (day < 0 || t === null) return false;
  return slots.some((s) => s.day === day && t >= s.start && t < s.end);
}

/** Bookable start times ("HH:MM") for a date, in `step` minute increments. Empty when the doctor is off that day. */
export function timeOptionsForDate(json, dateStr, step = 30) {
  const day = weekdayOf(dateStr);
  if (day < 0) return [];
  const times = new Set();
  for (const s of parseSlots(json)) {
    if (s.day !== day) continue;
    for (let t = s.start; t < s.end; t += step) times.add(t);
  }
  return [...times].sort((a, b) => a - b).map(fromMinutes);
}

/** "Sunday 09:00-12:00, Tuesday 14:00-17:30" (week starts on Sunday). */
export function describeSchedule(json) {
  return parseSlots(json)
    .sort((a, b) => a.day - b.day || a.start - b.start)
    .map((s) => `${titleCase(DAY_NAMES[s.day])} ${fromMinutes(s.start)}-${fromMinutes(s.end)}`)
    .join(", ");
}

export function dayName(dateStr) {
  const d = weekdayOf(dateStr);
  return d < 0 ? "" : titleCase(DAY_NAMES[d]);
}
