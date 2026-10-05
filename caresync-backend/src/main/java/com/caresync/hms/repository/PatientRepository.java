package com.caresync.hms.repository;

import com.caresync.hms.model.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {

    Optional<Patient> findByPatientCode(String patientCode);

    Optional<Patient> findByUser_Id(Long userId);

    List<Patient> findByStatus(String status);

    List<Patient> findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(
            String firstName, String lastName);

    @Query("SELECT p FROM Patient p WHERE p.status = :status ORDER BY p.createdAt DESC")
    List<Patient> findRecentByStatus(@Param("status") String status);

    long countByStatus(String status);

    @Query("SELECT COALESCE(MAX(p.id), 0) FROM Patient p")
    Long findMaxId();
}
