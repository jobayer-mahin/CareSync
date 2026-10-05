package com.caresync.hms.service;

import com.caresync.hms.dto.ContactDTO;
import com.caresync.hms.dto.MessageDTO;
import com.caresync.hms.exception.ResourceNotFoundException;
import com.caresync.hms.model.Doctor;
import com.caresync.hms.model.Message;
import com.caresync.hms.model.Patient;
import com.caresync.hms.model.User;
import com.caresync.hms.repository.DoctorRepository;
import com.caresync.hms.repository.MessageRepository;
import com.caresync.hms.repository.PatientRepository;
import com.caresync.hms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Chat between the three roles. Allowed pairs:
 * admin - patient, admin - doctor, patient - doctor.
 * (patient - patient and doctor - doctor are not allowed.)
 */
@Service
@RequiredArgsConstructor
public class MessageService {

    private static final int MAX_LENGTH = 2000;

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    @Transactional(readOnly = true)
    public List<ContactDTO> getContacts(String email) {
        User me = requireUser(email);

        // Everything this user has sent / received, newest first
        List<Message> mine = messageRepository.findAllForUser(me.getId());
        Map<Long, Message> lastByOther = new HashMap<>();
        Map<Long, Long> unreadByOther = new HashMap<>();
        for (Message m : mine) {
            Long other = m.getSenderId().equals(me.getId()) ? m.getReceiverId() : m.getSenderId();
            lastByOther.putIfAbsent(other, m);
            if (m.getReceiverId().equals(me.getId()) && !Boolean.TRUE.equals(m.getIsRead())) {
                unreadByOther.merge(other, 1L, Long::sum);
            }
        }

        List<ContactDTO> contacts = new ArrayList<>();
        String role = me.getRole();

        if (!"PATIENT".equals(role)) {
            for (Patient p : patientRepository.findAll()) {
                if (p.getUser() == null || !Boolean.TRUE.equals(p.getUser().getIsActive())) continue;
                contacts.add(build(p.getUser().getId(), p.getFirstName() + " " + p.getLastName(),
                        "PATIENT", p.getPatientCode(), lastByOther, unreadByOther));
            }
        }
        if (!"DOCTOR".equals(role)) {
            for (Doctor d : doctorRepository.findAll()) {
                if (d.getUser() == null || !Boolean.TRUE.equals(d.getUser().getIsActive())) continue;
                contacts.add(build(d.getUser().getId(), "Dr. " + d.getFirstName() + " " + d.getLastName(),
                        "DOCTOR", d.getSpecialization(), lastByOther, unreadByOther));
            }
        }
        if (!"ADMIN".equals(role)) {
            for (User admin : userRepository.findByRole("ADMIN")) {
                if (!Boolean.TRUE.equals(admin.getIsActive())) continue;
                contacts.add(build(admin.getId(), "Hospital Admin", "ADMIN", "Administration desk",
                        lastByOther, unreadByOther));
            }
        }

        contacts.sort(Comparator
                .comparing(ContactDTO::lastTime, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(ContactDTO::name, String.CASE_INSENSITIVE_ORDER));
        return contacts;
    }

    @Transactional
    public List<MessageDTO> getConversation(String email, Long otherUserId) {
        User me = requireUser(email);
        User other = requireAllowedPeer(me, otherUserId);

        // Mark everything they sent me as read
        List<Message> unread = messageRepository
                .findByReceiverIdAndSenderIdAndIsReadFalse(me.getId(), other.getId());
        if (!unread.isEmpty()) {
            unread.forEach(m -> m.setIsRead(true));
            messageRepository.saveAll(unread);
        }

        return messageRepository.findConversation(me.getId(), other.getId()).stream()
                .map(m -> toDTO(m, me.getId()))
                .collect(Collectors.toList());
    }

    @Transactional
    public MessageDTO send(String email, Long receiverId, String content) {
        User me = requireUser(email);
        if (receiverId == null) throw new IllegalArgumentException("Choose who to send the message to");
        String text = content == null ? "" : content.trim();
        if (text.isEmpty()) throw new IllegalArgumentException("Message cannot be empty");
        if (text.length() > MAX_LENGTH) {
            throw new IllegalArgumentException("Message is too long (max " + MAX_LENGTH + " characters)");
        }
        User other = requireAllowedPeer(me, receiverId);

        Message m = new Message();
        m.setSenderId(me.getId());
        m.setReceiverId(other.getId());
        m.setContent(text);
        m.setIsRead(false);
        return toDTO(messageRepository.save(m), me.getId());
    }

    @Transactional(readOnly = true)
    public long unreadCount(String email) {
        User me = requireUser(email);
        return messageRepository.countByReceiverIdAndIsReadFalse(me.getId());
    }

    // ----- helpers -----

    private ContactDTO build(Long userId, String name, String role, String subtitle,
                             Map<Long, Message> lastByOther, Map<Long, Long> unreadByOther) {
        Message last = lastByOther.get(userId);
        return new ContactDTO(userId, name, role, subtitle,
                unreadByOther.getOrDefault(userId, 0L),
                last != null ? last.getContent() : null,
                last != null ? last.getCreatedAt() : null);
    }

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }

    private User requireAllowedPeer(User me, Long otherUserId) {
        User other = userRepository.findById(otherUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", otherUserId));
        if (other.getId().equals(me.getId()) || me.getRole().equals(other.getRole())
                || !Boolean.TRUE.equals(other.getIsActive())) {
            throw new IllegalArgumentException("You cannot chat with this user");
        }
        return other;
    }

    private MessageDTO toDTO(Message m, Long myId) {
        LocalDateTime when = m.getCreatedAt() != null ? m.getCreatedAt() : LocalDateTime.now();
        return new MessageDTO(m.getId(), m.getSenderId(), m.getReceiverId(), m.getContent(), when,
                m.getSenderId().equals(myId));
    }
}
