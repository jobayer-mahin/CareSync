package com.caresync.hms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceDTO {

    private Long id;
    private String invoiceCode;

    @NotNull(message = "Patient ID is required")
    private Long patientId;
    private String patientName;

    private Long appointmentId;
    private LocalDate billingDate;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal discount;
    private String paymentStatus;
    private String paymentMethod;
    private String notes;
    private List<InvoiceItemDTO> items;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
