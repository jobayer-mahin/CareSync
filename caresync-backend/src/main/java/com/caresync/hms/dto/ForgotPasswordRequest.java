package com.caresync.hms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ForgotPasswordRequest {

    @NotBlank(message = "Email or Patient ID is required")
    private String identifier;

    @NotBlank(message = "Registered phone number is required")
    private String phone;

    @NotBlank(message = "New password is required")
    private String newPassword;
}
