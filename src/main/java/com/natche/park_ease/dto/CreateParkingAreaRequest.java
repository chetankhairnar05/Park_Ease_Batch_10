package com.natche.park_ease.dto;

import lombok.Data;
import java.util.List;

@Data
public class CreateParkingAreaRequest {
    private String name;
    private String address;
    private String latitude;
    private String longitude;

    // Capacities
    private Integer capacitySmall;
    private Integer capacityMedium;
    private Integer capacityLarge;

    // Base Rates for Slot Generation
    private Double baseRateSmall;
    private Double baseRateMedium;
    private Double baseRateLarge;

    // Configuration
    private List<Double> reservationRateMultipliers; // e.g. [0, 0.35, 0.65, 1.0]
    private Integer gracePeriodMinutes;
    private Integer waiverPeriodMinutes;
}