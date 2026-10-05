package com.caresync.hms.repository;

import com.caresync.hms.model.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    Optional<Invoice> findByInvoiceCode(String invoiceCode);

    List<Invoice> findByPatient_Id(Long patientId);

    List<Invoice> findByPaymentStatus(String paymentStatus);

    long countByPaymentStatus(String paymentStatus);

    @Query("SELECT COALESCE(SUM(i.paidAmount), 0) FROM Invoice i")
    BigDecimal getTotalRevenue();

    @Query("SELECT COALESCE(SUM(i.totalAmount - i.paidAmount), 0) FROM Invoice i WHERE i.paymentStatus IN ('Unpaid', 'Partial')")
    BigDecimal getTotalUnpaidAmount();

    @Query("SELECT COALESCE(MAX(i.id), 0) FROM Invoice i")
    Long findMaxId();
}
