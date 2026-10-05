package com.caresync.hms.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Reads a doctor's weekly schedule (the {@code availableSlots} JSON text stored on the doctor)
 * and answers one question: "is this date + time inside the doctor's schedule?".
 *
 * <pre>
 * availableSlots = [{"day":"Sunday","startTime":"09:00","endTime":"12:00"}, ...]
 * </pre>
 *
 * Booking rule:
 * <ul>
 *   <li>Doctor has at least one valid slot  -&gt; the appointment must fall inside a slot for that weekday
 *       (start time inclusive, end time exclusive).</li>
 *   <li>Doctor has no schedule (null / blank / "[]" / unreadable) -&gt; any time is allowed.</li>
 * </ul>
 */
public final class DoctorSchedule {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** One weekly availability window. */
    public record Slot(DayOfWeek day, LocalTime start, LocalTime end) {
        public boolean contains(DayOfWeek d, LocalTime t) {
            return day == d && !t.isBefore(start) && t.isBefore(end);
        }

        public String describe() {
            return day.getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + start + "-" + end;
        }
    }

    private DoctorSchedule() {
    }

    /** Parses the stored JSON. Malformed JSON or malformed entries are ignored, never thrown. */
    public static List<Slot> parse(String slotsJson) {
        List<Slot> slots = new ArrayList<>();
        if (slotsJson == null || slotsJson.isBlank()) return slots;
        try {
            JsonNode root = MAPPER.readTree(slotsJson);
            if (root == null || !root.isArray()) return slots;
            for (JsonNode n : root) {
                DayOfWeek day = parseDay(n.path("day").asText(null));
                LocalTime start = parseTime(n.path("startTime").asText(null));
                LocalTime end = parseTime(n.path("endTime").asText(null));
                if (day != null && start != null && end != null && start.isBefore(end)) {
                    slots.add(new Slot(day, start, end));
                }
            }
        } catch (Exception ignored) {
            // unreadable schedule == no schedule
        }
        return slots;
    }

    /** True when the doctor has published at least one usable slot. */
    public static boolean hasSchedule(String slotsJson) {
        return !parse(slotsJson).isEmpty();
    }

    /** The core rule: no schedule -> always true; otherwise the date/time must sit inside a slot. */
    public static boolean isWithinSchedule(String slotsJson, LocalDate date, LocalTime time) {
        List<Slot> slots = parse(slotsJson);
        if (slots.isEmpty()) return true;
        if (date == null || time == null) return false;
        DayOfWeek dow = date.getDayOfWeek();
        return slots.stream().anyMatch(s -> s.contains(dow, time));
    }

    /** Human readable list, e.g. "Sunday 09:00-12:00, Tuesday 14:00-17:00". */
    public static String describe(String slotsJson) {
        List<Slot> slots = parse(slotsJson);
        List<String> parts = new ArrayList<>();
        slots.stream()
                // week starts on Sunday, like the doctor's schedule editor
                .sorted((a, b) -> a.day() != b.day()
                        ? Integer.compare(a.day().getValue() % 7, b.day().getValue() % 7)
                        : a.start().compareTo(b.start()))
                .forEach(s -> parts.add(s.describe()));
        return String.join(", ", parts);
    }

    /** Accepts "Sunday", "sunday", "Sun", "Tues", ... (at least 3 letters). */
    private static DayOfWeek parseDay(String text) {
        if (text == null) return null;
        String t = text.trim().toLowerCase(Locale.ROOT);
        if (t.length() < 3) return null;
        for (DayOfWeek d : DayOfWeek.values()) {
            if (d.getDisplayName(TextStyle.FULL, Locale.ENGLISH).toLowerCase(Locale.ROOT).startsWith(t)) {
                return d;
            }
        }
        return null;
    }

    /** Accepts "09:00" and "09:00:00". */
    private static LocalTime parseTime(String text) {
        if (text == null) return null;
        try {
            return LocalTime.parse(text.trim());
        } catch (Exception e) {
            return null;
        }
    }
}
