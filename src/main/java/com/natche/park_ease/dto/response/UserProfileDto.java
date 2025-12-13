package com.natche.park_ease.dto.response;

import com.natche.park_ease.entity.User;
import lombok.Data;

@Data
public class UserProfileDto {
    private Long userId;
    private String name;
    private String email;
    private String phone;
    private String role;
    private Double walletBalance;
    private String latitude;
    private String longitude;

    // Helper to convert Entity to DTO
    public static UserProfileDto fromEntity(User user) {
        UserProfileDto dto = new UserProfileDto();
        dto.setUserId(user.getUserId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setPhone(user.getPhone());
        // Convert Enum to String safely
        dto.setRole(user.getRole() != null ? user.getRole().name() : "DRIVER");
        dto.setWalletBalance(user.getWalletBalance() != null ? user.getWalletBalance() : 0.0);
        dto.setLatitude(user.getLatitude());
        dto.setLongitude(user.getLongitude());
        return dto;
    }
}