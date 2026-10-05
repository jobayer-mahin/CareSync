package com.caresync.hms.repository;

import com.caresync.hms.model.EmergencyCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmergencyCaseRepository extends JpaRepository<EmergencyCase, Long> {

    Optional<EmergencyCase> findByCaseCode(String caseCode);

    List<EmergencyCase> findByStatus(String status);

    List<EmergencyCase> findByPriorityLevel(String priorityLevel);

    List<EmergencyCase> findByStatusOrderByArrivalTimeDesc(String status);

    long countByStatus(String status);

    long countByPriorityLevel(String priorityLevel);

    @Query("SELECT COALESCE(MAX(e.id), 0) FROM EmergencyCase e")
    Long findMaxId();
}
