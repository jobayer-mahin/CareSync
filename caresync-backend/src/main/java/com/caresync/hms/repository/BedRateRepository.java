package com.caresync.hms.repository;

import com.caresync.hms.model.BedRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BedRateRepository extends JpaRepository<BedRate, Long> {

    List<BedRate> findAllByOrderBySortOrderAsc();

    Optional<BedRate> findByBedType(String bedType);
}
