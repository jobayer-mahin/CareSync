package com.caresync.hms.service;

import com.caresync.hms.dto.BedRateDTO;
import com.caresync.hms.model.BedRate;
import com.caresync.hms.repository.BedRateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BedRateService {

    private static final BigDecimal MAX_RATE = new BigDecimal("1000000");

    private final BedRateRepository bedRateRepository;

    /** Bed categories and their default per-day price (BDT). */
    private static final String[][] DEFAULTS = {
            {"General ward", "800"},
            {"Semi-private cabin", "2000"},
            {"Private cabin", "3500"},
            {"Deluxe/VIP cabin", "6000"},
            {"ICU cabin/room", "10000"},
    };

    @Transactional
    public List<BedRateDTO> getAll() {
        if (bedRateRepository.count() == 0) {
            for (int i = 0; i < DEFAULTS.length; i++) {
                BedRate r = new BedRate();
                r.setBedType(DEFAULTS[i][0]);
                r.setDailyRate(new BigDecimal(DEFAULTS[i][1]));
                r.setSortOrder(i);
                bedRateRepository.save(r);
            }
        }
        return bedRateRepository.findAllByOrderBySortOrderAsc().stream()
                .map(r -> new BedRateDTO(r.getBedType(), r.getDailyRate()))
                .collect(Collectors.toList());
    }

    @Transactional
    public List<BedRateDTO> update(List<BedRateDTO> rates) {
        getAll(); // make sure defaults exist
        if (rates == null || rates.isEmpty()) {
            throw new IllegalArgumentException("No bed prices were sent");
        }
        for (BedRateDTO dto : rates) {
            if (dto.bedType() == null || dto.dailyRate() == null) {
                throw new IllegalArgumentException("Every bed type needs a price");
            }
            if (dto.dailyRate().compareTo(BigDecimal.ZERO) < 0 || dto.dailyRate().compareTo(MAX_RATE) > 0) {
                throw new IllegalArgumentException("Bed price for " + dto.bedType() + " must be between 0 and 1,000,000");
            }
            BedRate rate = bedRateRepository.findByBedType(dto.bedType())
                    .orElseThrow(() -> new IllegalArgumentException("Unknown bed type: " + dto.bedType()));
            rate.setDailyRate(dto.dailyRate());
            bedRateRepository.save(rate);
        }
        return getAll();
    }
}
