package com.caresync.hms.repository;

import com.caresync.hms.model.EmergencyActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmergencyActivityRepository extends JpaRepository<EmergencyActivity, Long> {

    List<EmergencyActivity> findByEmergencyCase_IdOrderByCreatedAtDesc(Long emergencyCaseId);

    List<EmergencyActivity> findTop20ByOrderByCreatedAtDesc();

    List<EmergencyActivity> findByActivityType(String activityType);
}
