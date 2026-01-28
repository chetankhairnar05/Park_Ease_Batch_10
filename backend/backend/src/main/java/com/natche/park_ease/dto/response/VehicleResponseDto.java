package com.natche.park_ease.dto.response;

import lombok.Data;
import com.natche.park_ease.entity.Vehicle;
import com.natche.park_ease.enums.VehicleType;

@Data
public class VehicleResponseDto {
    private Long vehicleId;
    private String registerNumber;
    private String model;
    private String color;
    private VehicleType type;
    private UserSummaryDto createdBy; // Nested DTO, not Entity

    public static VehicleResponseDto fromEntity(Vehicle vehicle) {
        VehicleResponseDto dto = new VehicleResponseDto();
        dto.setVehicleId(vehicle.getVehicleId());
        dto.setRegisterNumber(vehicle.getRegisterNumber());
        dto.setModel(vehicle.getModel());
        dto.setColor(vehicle.getColor());
        dto.setType(vehicle.getVehicleType());
        
        // Map the user safely
        if (vehicle.getCreatedBy() != null) {
            dto.setCreatedBy(UserSummaryDto.fromEntity(vehicle.getCreatedBy()));
        }
        return dto;
    }
}