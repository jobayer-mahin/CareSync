package com.caresync.hms.controller;

import com.caresync.hms.dto.ContactDTO;
import com.caresync.hms.dto.MessageDTO;
import com.caresync.hms.dto.SendMessageRequest;
import com.caresync.hms.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @GetMapping("/contacts")
    public ResponseEntity<List<ContactDTO>> contacts(Authentication authentication) {
        return ResponseEntity.ok(messageService.getContacts(authentication.getName()));
    }

    @GetMapping("/conversation/{userId}")
    public ResponseEntity<List<MessageDTO>> conversation(@PathVariable Long userId, Authentication authentication) {
        return ResponseEntity.ok(messageService.getConversation(authentication.getName(), userId));
    }

    @PostMapping
    public ResponseEntity<MessageDTO> send(@RequestBody SendMessageRequest request, Authentication authentication) {
        MessageDTO saved = messageService.send(authentication.getName(), request.receiverId(), request.content());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(Authentication authentication) {
        return ResponseEntity.ok(Map.of("unread", messageService.unreadCount(authentication.getName())));
    }
}
