package com.caresync.hms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class SymptomResultDTO {
    private String condition;
    private int matchPercentage;
    private String department;
    private String explanation;
    private String urgency;
    private List<String> matchedSymptoms;
    private List<String> recommendedActions;
}
