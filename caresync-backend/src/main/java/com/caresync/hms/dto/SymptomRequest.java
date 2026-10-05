package com.caresync.hms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SymptomRequest {
    @NotBlank(message = "Symptoms are required")
    private String symptoms;
}
