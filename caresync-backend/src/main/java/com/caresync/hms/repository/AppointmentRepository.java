package com.caresync.hms.repository;

import com.caresync.hms.model.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    Optional<Appointment> findByAppointmentCode(String appointmentCode);

    List<Appointment> findByPatient_Id(Long patientId);

    List<Appointment> findByDoctor_Id(Long doctorId);

    List<Appointment> findByAppointmentDate(LocalDate date);

    List<Appointment> findByStatus(String status);

    @Query("SELECT a FROM Appointment a WHERE a.appointmentDate = :date ORDER BY a.appointmentTime ASC")
    List<Appointment> findTodayAppointments(@Param("date") LocalDate date);

    long countByAppointmentDate(LocalDate date);

    long countByStatus(String status);

    @Query("SELECT COALESCE(MAX(a.id), 0) FROM Appointment a")
    Long findMaxId();
}
