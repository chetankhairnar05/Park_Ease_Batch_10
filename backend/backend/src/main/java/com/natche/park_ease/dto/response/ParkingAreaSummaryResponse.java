package com.natche.park_ease.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ParkingAreaSummaryResponse {
    private Long areaId;
    private String name;
    private String distanceKm;
    private String address;
    
    // Available Slot Counts
    private long availableSmall;
    private long availableMedium;
    private long availableLarge;
    private String latitude;
    private String longitude;
}