package com.caresync.hms.service;

import com.caresync.hms.dto.DashboardStatsDTO;
import com.caresync.hms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final InvoiceRepository invoiceRepository;
    private final DepartmentRepository departmentRepository;
    private final EmergencyCaseRepository emergencyCaseRepository;

    @Transactional(readOnly = true)
    public DashboardStatsDTO getStats() {
        DashboardStatsDTO stats = new DashboardStatsDTO();

        stats.setTotalPatients(patientRepository.count());
        stats.setActiveDoctors(doctorRepository.countByIsAvailableTrue());
        stats.setTodayAppointments(appointmentRepository.countByAppointmentDate(LocalDate.now()));
        stats.setPendingInvoices(invoiceRepository.countByPaymentStatus("Unpaid"));
        stats.setActiveEmergencyCases(emergencyCaseRepository.countByStatus("Active"));
        stats.setCriticalCases(emergencyCaseRepository.countByPriorityLevel("P1"));
        stats.setAdmittedPatients(patientRepository.countByStatus("Admitted"));

        Long totalBeds = departmentRepository.getTotalBedCapacity();
        Long occupiedBeds = departmentRepository.getTotalOccupiedBeds();
        stats.setTotalBeds(totalBeds != null ? totalBeds : 0);
        stats.setAvailableBeds(
                (totalBeds != null ? totalBeds : 0) - (occupiedBeds != null ? occupiedBeds : 0));

        BigDecimal revenue = invoiceRepository.getTotalRevenue();
        stats.setTotalRevenue(revenue != null ? revenue : BigDecimal.ZERO);

        BigDecimal unpaid = invoiceRepository.getTotalUnpaidAmount();
        stats.setUnpaidAmount(unpaid != null ? unpaid : BigDecimal.ZERO);

        return stats;
    }
}
