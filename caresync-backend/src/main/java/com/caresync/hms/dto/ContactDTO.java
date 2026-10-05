package com.caresync.hms.dto;

import java.time.LocalDateTime;

/** A person the current user is allowed to chat with. */
public record ContactDTO(Long userId, String name, String role, String subtitle,
                         long unread, String lastMessage, LocalDateTime lastTime) {
}
