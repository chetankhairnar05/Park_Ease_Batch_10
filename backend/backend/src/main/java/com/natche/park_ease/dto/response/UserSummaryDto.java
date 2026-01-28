package com.natche.park_ease.dto.response;

import lombok.Data;
import com.natche.park_ease.entity.User;

@Data
public class UserSummaryDto {
    private Long userId;
    private String name;
    private String email;
    private String phone;
    // No Password! 
    
    // Helper to map Entity to DTO
    public static UserSummaryDto fromEntity(User user) {
        UserSummaryDto dto = new UserSummaryDto();
        dto.setUserId(user.getUserId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setPhone(user.getPhone());
        return dto;
    }
}