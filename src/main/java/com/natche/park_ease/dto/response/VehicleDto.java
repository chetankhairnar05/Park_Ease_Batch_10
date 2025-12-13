package com.natche.park_ease.dto.response;

import com.natche.park_ease.entity.Vehicle;
import com.natche.park_ease.enums.VehicleType;
import lombok.Data;

@Data
public class VehicleDto {
    private Long vehicleId;
    private String registerNumber;
    private String model;
    private String color;
    private VehicleType vehicleType;

    public static VehicleDto fromEntity(Vehicle v) {
        VehicleDto dto = new VehicleDto();
        dto.setVehicleId(v.getVehicleId());
        dto.setRegisterNumber(v.getRegisterNumber());
        dto.setModel(v.getModel());
        dto.setColor(v.getColor());
        dto.setVehicleType(v.getVehicleType());
        return dto;
    }
}