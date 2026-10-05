package com.caresync.hms.repository;

import com.caresync.hms.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("SELECT m FROM Message m WHERE (m.senderId = :a AND m.receiverId = :b) "
            + "OR (m.senderId = :b AND m.receiverId = :a) ORDER BY m.createdAt ASC, m.id ASC")
    List<Message> findConversation(@Param("a") Long a, @Param("b") Long b);

    @Query("SELECT m FROM Message m WHERE m.senderId = :u OR m.receiverId = :u ORDER BY m.createdAt DESC, m.id DESC")
    List<Message> findAllForUser(@Param("u") Long userId);

    List<Message> findByReceiverIdAndSenderIdAndIsReadFalse(Long receiverId, Long senderId);

    long countByReceiverIdAndIsReadFalse(Long receiverId);
}
