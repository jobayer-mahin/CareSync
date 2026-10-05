package com.caresync.hms.dto;

import java.time.LocalDateTime;

public record MessageDTO(Long id, Long senderId, Long receiverId, String content,
                         LocalDateTime createdAt, boolean mine) {
}
