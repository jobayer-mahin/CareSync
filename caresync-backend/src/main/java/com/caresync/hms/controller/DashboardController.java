package com.caresync.hms.controller;

import com.caresync.hms.dto.DashboardStatsDTO;
import com.caresync.hms.dto.AppointmentDTO;
import com.caresync.hms.dto.PatientDTO;
import com.caresync.hms.service.AppointmentService;
import com.caresync.hms.service.DashboardService;
import com.caresync.hms.service.PatientService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final PatientService patientService;
    private final AppointmentService appointmentService;

    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsDTO> getStats() {
        return ResponseEntity.ok(dashboardService.getStats());
    }

    @GetMapping("/recent-patients")
    public ResponseEntity<List<PatientDTO>> getRecentPatients() {
        return ResponseEntity.ok(patientService.getRecentPatientsByStatus("Active"));
    }

    @GetMapping("/appointments-today")
    public ResponseEntity<List<AppointmentDTO>> getTodayAppointments() {
        return ResponseEntity.ok(appointmentService.getTodayAppointments());
    }
}
