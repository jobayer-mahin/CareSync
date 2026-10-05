package com.caresync.hms.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender javaMailSender;

    public void sendAppointmentReminder(String to, String patientName, String date, String time, String doctorName) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("noreply@caresync.com");
            message.setTo(to);
            message.setSubject("CareSync: Appointment Confirmation");
            message.setText("Dear " + patientName + ",\n\n" +
                    "Your appointment is confirmed for " + date + " at " + time + " with Dr. " + doctorName + ".\n\n" +
                    "Thank you,\nCareSync HMS");
            javaMailSender.send(message);
            log.info("Sent appointment reminder email to {}", to);
        } catch (Exception e) {
            log.error("Failed to send email to {}. Make sure SMTP is configured. (Error: {})", to, e.getMessage());
        }
    }

    public void sendInvoiceNotification(String to, String patientName, String invoiceCode, BigDecimal total, String status) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("noreply@caresync.com");
            message.setTo(to);
            message.setSubject("CareSync: New Invoice " + invoiceCode);
            message.setText("Dear " + patientName + ",\n\n" +
                    "A new invoice has been generated for you.\n" +
                    "Invoice: " + invoiceCode + "\n" +
                    "Amount: ৳" + total + "\n" +
                    "Payment status: " + status + "\n\n" +
                    "Please log in to CareSync HMS to view your billing details.\n\n" +
                    "Thank you,\nCareSync HMS");
            javaMailSender.send(message);
            log.info("Sent invoice notification {} to {}", invoiceCode, to);
        } catch (Exception e) {
            log.error("Failed to send invoice {} to {}. Make sure SMTP is configured. (Error: {})", invoiceCode, to, e.getMessage());
        }
    }

    public void sendAppointmentUpdate(String to, String patientName, String details) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("noreply@caresync.com");
            message.setTo(to);
            message.setSubject("CareSync: Your appointment was updated");
            message.setText("Dear " + patientName + ",\n\n" + details + "\n\n" +
                    "Please log in to CareSync HMS to see the latest details.\n\n" +
                    "Thank you,\nCareSync HMS");
            javaMailSender.send(message);
            log.info("Sent appointment update email to {}", to);
        } catch (Exception e) {
            log.error("Failed to send appointment update to {}. Make sure SMTP is configured. (Error: {})", to, e.getMessage());
        }
    }
}
