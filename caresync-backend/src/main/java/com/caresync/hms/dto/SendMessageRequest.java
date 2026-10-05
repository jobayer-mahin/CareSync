package com.caresync.hms.dto;

public record SendMessageRequest(Long receiverId, String content) {
}
