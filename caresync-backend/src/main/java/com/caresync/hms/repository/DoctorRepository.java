package com.caresync.hms.repository;

import com.caresync.hms.model.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, Long> {

    Optional<Doctor> findByDoctorCode(String doctorCode);

    Optional<Doctor> findByUser_Id(Long userId);

    List<Doctor> findByDepartment_Id(Long departmentId);

    List<Doctor> findBySpecializationContainingIgnoreCase(String specialization);

    List<Doctor> findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(String firstName, String lastName);

    List<Doctor> findByIsAvailableTrue();

    long countByIsAvailableTrue();

    @Query("SELECT COALESCE(MAX(d.id), 0) FROM Doctor d")
    Long findMaxId();
}
