package com.caresync.hms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceItemDTO {

    private Long id;

    @NotBlank(message = "Description is required")
    private String description;

    private Integer quantity = 1;

    @NotNull(message = "Unit price is required")
    private BigDecimal unitPrice;

    private BigDecimal totalPrice;
}
