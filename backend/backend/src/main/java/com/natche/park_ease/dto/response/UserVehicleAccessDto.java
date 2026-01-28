package com.natche.park_ease.dto.response;

import com.natche.park_ease.entity.UserVehicleAccess;
import com.natche.park_ease.enums.UserVehicleAccessRole;
import lombok.Data;

@Data
public class UserVehicleAccessDto {
    private Long accessId;
    private UserVehicleAccessRole role;
    private Boolean isPrimary;
    private VehicleDto vehicle;

    public static UserVehicleAccessDto fromEntity(UserVehicleAccess access) {
        UserVehicleAccessDto dto = new UserVehicleAccessDto();
        dto.setAccessId(access.getId());
        dto.setRole(access.getRole());
        dto.setIsPrimary(access.getIsPrimary());
        // Map the inner vehicle entity to DTO
        if (access.getVehicle() != null) {
            dto.setVehicle(VehicleDto.fromEntity(access.getVehicle()));
        }
        return dto;
    }
}