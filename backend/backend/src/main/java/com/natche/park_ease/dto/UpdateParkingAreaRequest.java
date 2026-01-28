package com.natche.park_ease.dto;

import lombok.Data;
import java.util.List;

@Data
public class UpdateParkingAreaRequest {
    private String name;
    private String address;
    private String latitude;
    private String longitude;

    // If these change, we trigger the Slot Adjustment Logic
    private Integer capacitySmall;
    private Integer capacityMedium;
    private Integer capacityLarge;

    // Rates & Config
    private List<Double> reservationRateMultipliers;
    private Integer gracePeriodMinutes;
    private Integer waiverPeriodMinutes;
}