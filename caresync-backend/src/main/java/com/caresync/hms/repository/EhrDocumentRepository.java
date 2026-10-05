package com.caresync.hms.repository;

import com.caresync.hms.model.EhrDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EhrDocumentRepository extends JpaRepository<EhrDocument, Long> {
    List<EhrDocument> findByPatient_IdOrderByUploadedAtDesc(Long patientId);
}
