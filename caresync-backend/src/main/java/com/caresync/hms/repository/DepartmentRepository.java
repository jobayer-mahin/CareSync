package com.caresync.hms.repository;

import com.caresync.hms.model.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Long> {

    Optional<Department> findByDepartmentName(String departmentName);

    Optional<Department> findByDepartmentCode(String departmentCode);

    @Query("SELECT SUM(d.bedCapacity) FROM Department d")
    Long getTotalBedCapacity();

    @Query("SELECT SUM(d.occupiedBeds) FROM Department d")
    Long getTotalOccupiedBeds();
}
