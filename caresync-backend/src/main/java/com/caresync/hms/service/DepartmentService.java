package com.caresync.hms.service;

import com.caresync.hms.dto.DepartmentDTO;
import com.caresync.hms.exception.ResourceNotFoundException;
import com.caresync.hms.model.Department;
import com.caresync.hms.model.Doctor;
import com.caresync.hms.repository.DoctorRepository;
import com.caresync.hms.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final DoctorRepository doctorRepository;

    @Transactional(readOnly = true)
    public List<DepartmentDTO> getAllDepartments() {
        return departmentRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DepartmentDTO getDepartmentById(Long id) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", "id", id));
        return convertToDTO(department);
    }

    @Transactional
    public DepartmentDTO createDepartment(DepartmentDTO departmentDTO) {
        validateHeadDoctor(departmentDTO.getHeadDoctorId());
        Department department = convertToEntity(departmentDTO);
        Department savedDepartment = departmentRepository.save(department);
        return convertToDTO(savedDepartment);
    }

    @Transactional
    public DepartmentDTO updateDepartment(Long id, DepartmentDTO departmentDTO) {
        Department existingDept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", "id", id));

        validateHeadDoctor(departmentDTO.getHeadDoctorId());

        existingDept.setDepartmentName(departmentDTO.getDepartmentName());
        existingDept.setDepartmentCode(departmentDTO.getDepartmentCode());
        // The head doctor is always taken from the request: null means "no head doctor".
        existingDept.setHeadDoctorId(departmentDTO.getHeadDoctorId());
        if (departmentDTO.getFloorNumber() != null) existingDept.setFloorNumber(departmentDTO.getFloorNumber());
        if (departmentDTO.getBuilding() != null) existingDept.setBuilding(departmentDTO.getBuilding());
        if (departmentDTO.getBedCapacity() != null) existingDept.setBedCapacity(departmentDTO.getBedCapacity());
        if (departmentDTO.getOccupiedBeds() != null) existingDept.setOccupiedBeds(departmentDTO.getOccupiedBeds());
        if (departmentDTO.getNurseCount() != null) existingDept.setNurseCount(departmentDTO.getNurseCount());
        if (departmentDTO.getStatus() != null) existingDept.setStatus(departmentDTO.getStatus());
        existingDept.setPhoneExtension(departmentDTO.getPhoneExtension() != null
                ? departmentDTO.getPhoneExtension() : existingDept.getPhoneExtension());
        existingDept.setDescription(departmentDTO.getDescription());

        Department updatedDept = departmentRepository.save(existingDept);
        return convertToDTO(updatedDept);
    }

    @Transactional
    public void deleteDepartment(Long id) {
        if (!departmentRepository.existsById(id)) {
            throw new ResourceNotFoundException("Department", "id", id);
        }
        departmentRepository.deleteById(id);
    }

    private void validateHeadDoctor(Long headDoctorId) {
        if (headDoctorId != null && !doctorRepository.existsById(headDoctorId)) {
            throw new ResourceNotFoundException("Doctor", "id", headDoctorId);
        }
    }

    private String headDoctorName(Long headDoctorId) {
        if (headDoctorId == null) return null;
        return doctorRepository.findById(headDoctorId)
                .map((Doctor d) -> "Dr. " + d.getFirstName() + " " + d.getLastName())
                .orElse(null);
    }

    // DTO conversion methods
    private DepartmentDTO convertToDTO(Department department) {
        DepartmentDTO dto = new DepartmentDTO();
        dto.setId(department.getId());
        dto.setDepartmentName(department.getDepartmentName());
        dto.setDepartmentCode(department.getDepartmentCode());
        dto.setHeadDoctorId(department.getHeadDoctorId());
        dto.setHeadDoctorName(headDoctorName(department.getHeadDoctorId()));
        dto.setFloorNumber(department.getFloorNumber());
        dto.setBuilding(department.getBuilding());
        dto.setBedCapacity(department.getBedCapacity());
        dto.setOccupiedBeds(department.getOccupiedBeds());
        dto.setAvailableBeds(department.getBedCapacity() != null && department.getOccupiedBeds() != null
                ? department.getBedCapacity() - department.getOccupiedBeds() : 0);
        dto.setNurseCount(department.getNurseCount());
        dto.setStatus(department.getStatus());
        dto.setPhoneExtension(department.getPhoneExtension());
        dto.setDescription(department.getDescription());
        dto.setCreatedAt(department.getCreatedAt());
        dto.setUpdatedAt(department.getUpdatedAt());
        return dto;
    }

    private Department convertToEntity(DepartmentDTO dto) {
        Department department = new Department();
        department.setDepartmentName(dto.getDepartmentName());
        department.setDepartmentCode(dto.getDepartmentCode());
        department.setHeadDoctorId(dto.getHeadDoctorId());
        department.setFloorNumber(dto.getFloorNumber());
        department.setBuilding(dto.getBuilding());
        department.setBedCapacity(dto.getBedCapacity());
        department.setOccupiedBeds(dto.getOccupiedBeds() != null ? dto.getOccupiedBeds() : 0);
        department.setNurseCount(dto.getNurseCount() != null ? dto.getNurseCount() : 0);
        department.setStatus(dto.getStatus() != null ? dto.getStatus() : "Active");
        department.setPhoneExtension(dto.getPhoneExtension());
        department.setDescription(dto.getDescription());
        return department;
    }
}
