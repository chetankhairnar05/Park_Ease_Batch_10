package com.natche.park_ease.dto;

import com.natche.park_ease.enums.VehicleType;
import lombok.Data;

@Data
public class CreateSlotRequest {
    private String slotNumber; // e.g. "A-105"
    private Integer floor;
    private VehicleType supportedVehicleType; // SMALL, MEDIUM, LARGE
    private Double baseHourlyRate;
}