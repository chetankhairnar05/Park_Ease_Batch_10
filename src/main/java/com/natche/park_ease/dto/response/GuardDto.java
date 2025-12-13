package com.natche.park_ease.dto.response;

import com.natche.park_ease.entity.Guard;
import lombok.Data;

@Data
public class GuardDto {
    private Long guardEntryId; // ID from 'guards' table
    private Long userId;       // ID from 'users' table
    private String name;
    private String email;
    private String phone;

    public static GuardDto fromEntity(Guard guard) {
        GuardDto dto = new GuardDto();
        dto.setGuardEntryId(guard.getGuardId());
        if (guard.getUser() != null) {
            dto.setUserId(guard.getUser().getUserId());
            dto.setName(guard.getUser().getName());
            dto.setEmail(guard.getUser().getEmail());
            dto.setPhone(guard.getUser().getPhone());
        }
        return dto;
    }
}