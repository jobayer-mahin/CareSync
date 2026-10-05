package com.caresync.hms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDTO {

    private long totalPatients;
    private long activeDoctors;
    private long todayAppointments;
    private long pendingInvoices;
    private long activeEmergencyCases;
    private long criticalCases;
    private long totalBeds;
    private long availableBeds;
    private long admittedPatients;
    private long dischargedThisMonth;
    private BigDecimal totalRevenue;
    private BigDecimal unpaidAmount;
}
