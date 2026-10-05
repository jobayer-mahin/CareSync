package com.caresync.hms.service;

import com.caresync.hms.dto.InvoiceDTO;
import com.caresync.hms.dto.InvoiceItemDTO;
import com.caresync.hms.exception.ResourceNotFoundException;
import com.caresync.hms.model.*;
import com.caresync.hms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BillingService {

    private final InvoiceRepository invoiceRepository;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final EmailService emailService;

    @Transactional(readOnly = true)
    public List<InvoiceDTO> getAllInvoices() {
        return invoiceRepository.findAll().stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public InvoiceDTO getInvoiceById(Long id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", "id", id));
        return convertToDTO(invoice);
    }

    @Transactional
    public InvoiceDTO createInvoice(InvoiceDTO invoiceDTO) {
        Patient patient = patientRepository.findById(invoiceDTO.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "id", invoiceDTO.getPatientId()));

        Invoice invoice = new Invoice();
        invoice.setPatient(patient);

        if (invoiceDTO.getAppointmentId() != null) {
            Appointment appointment = appointmentRepository.findById(invoiceDTO.getAppointmentId()).orElse(null);
            invoice.setAppointment(appointment);
        }

        Long maxId = invoiceRepository.findMaxId();
        invoice.setInvoiceCode("INV-" + String.format("%04d", maxId + 1));

        BigDecimal discount = invoiceDTO.getDiscount() != null ? invoiceDTO.getDiscount() : BigDecimal.ZERO;
        if (discount.compareTo(BigDecimal.ZERO) < 0 || discount.compareTo(new BigDecimal("100")) > 0) {
            throw new IllegalArgumentException("Discount must be between 0 and 100 percent");
        }

        invoice.setDiscount(discount);
        invoice.setPaymentMethod(invoiceDTO.getPaymentMethod());
        invoice.setNotes(invoiceDTO.getNotes());

        List<InvoiceItem> items = buildItems(invoice, invoiceDTO.getItems());
        BigDecimal subtotal = sumItems(items);

        BigDecimal discountAmount = subtotal.multiply(discount).divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
        invoice.setItems(items);
        invoice.setTotalAmount(subtotal.subtract(discountAmount));
        applyPayment(invoice, invoiceDTO.getPaymentStatus(), invoiceDTO.getPaidAmount());
        Invoice savedInvoice = invoiceRepository.save(invoice);
        sendInvoiceEmail(savedInvoice);
        return convertToDTO(savedInvoice);
    }

    @Transactional
    public InvoiceDTO updateInvoice(Long id, InvoiceDTO invoiceDTO) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", "id", id));

        invoice.setPaymentMethod(invoiceDTO.getPaymentMethod());
        invoice.setNotes(invoiceDTO.getNotes());

        BigDecimal discount = invoiceDTO.getDiscount() != null ? invoiceDTO.getDiscount() : BigDecimal.ZERO;
        if (discount.compareTo(BigDecimal.ZERO) < 0 || discount.compareTo(new BigDecimal("100")) > 0) {
            throw new IllegalArgumentException("Discount must be between 0 and 100 percent");
        }

        // When line items are sent (services, custom services, bed charges ...) they replace the old ones.
        if (invoiceDTO.getItems() != null) {
            List<InvoiceItem> newItems = buildItems(invoice, invoiceDTO.getItems());
            if (newItems.isEmpty()) {
                throw new IllegalArgumentException("An invoice needs at least one line item");
            }
            invoice.getItems().clear();
            invoice.getItems().addAll(newItems);
        }

        BigDecimal subtotal = sumItems(invoice.getItems());
        BigDecimal discountAmount = subtotal.multiply(discount).divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
        invoice.setDiscount(discount);
        invoice.setTotalAmount(subtotal.subtract(discountAmount));
        applyPayment(invoice, invoiceDTO.getPaymentStatus(), invoiceDTO.getPaidAmount());

        Invoice updatedInvoice = invoiceRepository.save(invoice);
        return convertToDTO(updatedInvoice);
    }

    /** Validates the submitted lines and turns them into entities (descriptions are trimmed to 200 chars). */
    private List<InvoiceItem> buildItems(Invoice invoice, List<InvoiceItemDTO> dtos) {
        List<InvoiceItem> items = new ArrayList<>();
        if (dtos == null) return items;
        for (InvoiceItemDTO itemDTO : dtos) {
            if (itemDTO.getUnitPrice() == null) {
                throw new IllegalArgumentException("Unit price is required for every invoice item");
            }
            int quantity = itemDTO.getQuantity() != null ? itemDTO.getQuantity() : 1;
            if (quantity <= 0) {
                throw new IllegalArgumentException("Invoice item quantity must be greater than zero");
            }
            if (itemDTO.getUnitPrice().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Invoice item unit price cannot be negative");
            }
            String description = itemDTO.getDescription() == null ? "" : itemDTO.getDescription().trim();
            if (description.isEmpty()) description = "Custom Service";
            if (description.length() > 200) description = description.substring(0, 200);

            InvoiceItem item = new InvoiceItem();
            item.setInvoice(invoice);
            item.setDescription(description);
            item.setQuantity(quantity);
            item.setUnitPrice(itemDTO.getUnitPrice());
            item.setTotalPrice(itemDTO.getUnitPrice().multiply(BigDecimal.valueOf(quantity)));
            items.add(item);
        }
        return items;
    }

    private BigDecimal sumItems(List<InvoiceItem> items) {
        return items.stream()
                .map(InvoiceItem::getTotalPrice)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** Keeps paymentStatus and paidAmount consistent with each other. */
    private void applyPayment(Invoice invoice, String requestedStatus, BigDecimal requestedPaid) {
        BigDecimal total = invoice.getTotalAmount() != null ? invoice.getTotalAmount() : BigDecimal.ZERO;
        if ("Paid".equalsIgnoreCase(requestedStatus)) {
            invoice.setPaymentStatus("Paid");
            invoice.setPaidAmount(total);
        } else if ("Partial".equalsIgnoreCase(requestedStatus)) {
            BigDecimal paid = requestedPaid != null ? requestedPaid
                    : (invoice.getPaidAmount() != null ? invoice.getPaidAmount() : BigDecimal.ZERO);
            if (paid.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Enter the amount already paid for a partial payment");
            }
            if (paid.compareTo(total) >= 0) {
                invoice.setPaymentStatus("Paid");
                invoice.setPaidAmount(total);
            } else {
                invoice.setPaymentStatus("Partial");
                invoice.setPaidAmount(paid);
            }
        } else {
            invoice.setPaymentStatus("Unpaid");
            invoice.setPaidAmount(BigDecimal.ZERO);
        }
    }

    @Transactional
    public void deleteInvoice(Long id) {
        if (!invoiceRepository.existsById(id)) {
            throw new ResourceNotFoundException("Invoice", "id", id);
        }
        invoiceRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<InvoiceDTO> getInvoicesByPatient(Long patientId) {
        return invoiceRepository.findByPatient_Id(patientId).stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<InvoiceDTO> getUnpaidInvoices() {
        return invoiceRepository.findByPaymentStatus("Unpaid").stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @Transactional
    public InvoiceDTO recordPayment(Long id, BigDecimal amount) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", "id", id));

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Payment amount must be greater than zero");
        }

        BigDecimal currentPaid = invoice.getPaidAmount() != null ? invoice.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal totalAmount = invoice.getTotalAmount() != null ? invoice.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal remaining = totalAmount.subtract(currentPaid);

        if (amount.compareTo(remaining) > 0) {
            throw new IllegalArgumentException("Payment amount cannot exceed the remaining balance");
        }

        BigDecimal newPaidAmount = currentPaid.add(amount);
        invoice.setPaidAmount(newPaidAmount);

        if (newPaidAmount.compareTo(totalAmount) == 0) {
            invoice.setPaymentStatus("Paid");
        } else {
            invoice.setPaymentStatus("Partial");
        }

        Invoice updatedInvoice = invoiceRepository.save(invoice);
        return convertToDTO(updatedInvoice);
    }

    private void sendInvoiceEmail(Invoice invoice) {
        if (invoice.getPatient() == null || invoice.getPatient().getUser() == null || invoice.getPatient().getUser().getEmail() == null) return;
        emailService.sendInvoiceNotification(
                invoice.getPatient().getUser().getEmail(),
                invoice.getPatient().getFirstName() + " " + invoice.getPatient().getLastName(),
                invoice.getInvoiceCode(),
                invoice.getTotalAmount(),
                invoice.getPaymentStatus()
        );
    }

    private InvoiceDTO convertToDTO(Invoice invoice) {
        InvoiceDTO dto = new InvoiceDTO();
        dto.setId(invoice.getId());
        dto.setInvoiceCode(invoice.getInvoiceCode());
        dto.setBillingDate(invoice.getBillingDate());
        dto.setTotalAmount(invoice.getTotalAmount());
        dto.setPaidAmount(invoice.getPaidAmount());
        dto.setDiscount(invoice.getDiscount());
        dto.setPaymentStatus(invoice.getPaymentStatus());
        dto.setPaymentMethod(invoice.getPaymentMethod());
        dto.setNotes(invoice.getNotes());
        dto.setCreatedAt(invoice.getCreatedAt());
        dto.setUpdatedAt(invoice.getUpdatedAt());

        if (invoice.getPatient() != null) {
            dto.setPatientId(invoice.getPatient().getId());
            dto.setPatientName(invoice.getPatient().getFirstName() + " " + invoice.getPatient().getLastName());
        }
        if (invoice.getAppointment() != null) {
            dto.setAppointmentId(invoice.getAppointment().getId());
        }

        if (invoice.getItems() != null) {
            dto.setItems(invoice.getItems().stream().map(item -> {
                InvoiceItemDTO itemDTO = new InvoiceItemDTO();
                itemDTO.setId(item.getId());
                itemDTO.setDescription(item.getDescription());
                itemDTO.setQuantity(item.getQuantity());
                itemDTO.setUnitPrice(item.getUnitPrice());
                itemDTO.setTotalPrice(item.getTotalPrice());
                return itemDTO;
            }).collect(Collectors.toList()));
        }
        return dto;
    }
}
