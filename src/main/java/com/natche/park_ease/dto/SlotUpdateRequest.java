package com.natche.park_ease.dto;

import com.natche.park_ease.enums.VehicleType;
// import com.natche.parking.Enum.VehicleType;
import com.natche.park_ease.enums.ParkingSlotStatus;
import lombok.Data;

@Data
public class SlotUpdateRequest {
    private Long slotId;
    private String slotNumber; // e.g. "A-101"
    private Integer floor;
    private ParkingSlotStatus status;
    private Double hourlyRate;
    private VehicleType type;

    //vehicle type
    // private VehicleType type;

}