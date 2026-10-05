package com.caresync.hms.service;

import com.caresync.hms.dto.NotificationDTO;
import com.caresync.hms.exception.ResourceNotFoundException;
import com.caresync.hms.model.Notification;
import com.caresync.hms.model.User;
import com.caresync.hms.repository.NotificationRepository;
import com.caresync.hms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional
    public void notifyUser(Long userId, String type, String title, String message, String link) {
        if (userId == null) return;
        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(type);
        n.setTitle(title.length() > 150 ? title.substring(0, 150) : title);
        n.setMessage(message);
        n.setLink(link);
        n.setIsRead(false);
        notificationRepository.save(n);
    }

    /** Sends the same notification to every active user that has the given role. */
    @Transactional
    public void notifyRole(String role, String type, String title, String message, String link) {
        for (User u : userRepository.findByRole(role)) {
            if (Boolean.TRUE.equals(u.getIsActive())) {
                notifyUser(u.getId(), type, title, message, link);
            }
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> listFor(String email) {
        User user = requireUser(email);
        List<NotificationDTO> items = notificationRepository
                .findTop30ByUserIdOrderByCreatedAtDescIdDesc(user.getId())
                .stream().map(this::toDTO).collect(Collectors.toList());
        long unread = notificationRepository.countByUserIdAndIsReadFalse(user.getId());
        return Map.of("unread", unread, "items", items);
    }

    @Transactional
    public void markRead(String email, Long id) {
        User user = requireUser(email);
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", id));
        if (!user.getId().equals(n.getUserId())) {
            throw new ResourceNotFoundException("Notification", "id", id);
        }
        n.setIsRead(true);
        notificationRepository.save(n);
    }

    @Transactional
    public void markAllRead(String email) {
        User user = requireUser(email);
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalse(user.getId());
        unread.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(unread);
    }

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }

    private NotificationDTO toDTO(Notification n) {
        return new NotificationDTO(n.getId(), n.getType(), n.getTitle(), n.getMessage(), n.getLink(),
                Boolean.TRUE.equals(n.getIsRead()), n.getCreatedAt());
    }
}
