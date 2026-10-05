package com.caresync.hms.controller;

import com.caresync.hms.dto.BedRateDTO;
import com.caresync.hms.service.BedRateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bed-rates")
@RequiredArgsConstructor
public class BedRateController {

    private final BedRateService bedRateService;

    @GetMapping
    public ResponseEntity<List<BedRateDTO>> getAll() {
        return ResponseEntity.ok(bedRateService.getAll());
    }

    @PutMapping
    public ResponseEntity<List<BedRateDTO>> update(@RequestBody List<BedRateDTO> rates) {
        return ResponseEntity.ok(bedRateService.update(rates));
    }
}
