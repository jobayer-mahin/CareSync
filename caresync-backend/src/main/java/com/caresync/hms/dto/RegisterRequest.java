package com.caresync.hms.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data @NoArgsConstructor @AllArgsConstructor
public class RegisterRequest {
    @NotBlank @Email private String email;
    @NotBlank private String password;
    @NotBlank private String role;
    @NotBlank private String firstName;
    @NotBlank private String lastName;
    private LocalDate dateOfBirth;
    private String gender;
    private String bloodGroup;
    @NotBlank private String phone;
    private String specialization;
    private String qualification;
    private Long departmentId;
}
