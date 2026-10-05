package com.caresync.hms.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** Per-day price of a bed / room category. Editable by the admin. */
@Entity
@Table(name = "bed_rates")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BedRate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bed_rate_id")
    private Long id;

    @Column(name = "bed_type", unique = true, nullable = false, length = 50)
    private String bedType;

    @Column(name = "daily_rate", precision = 10, scale = 2, nullable = false)
    private BigDecimal dailyRate = BigDecimal.ZERO;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;
}
