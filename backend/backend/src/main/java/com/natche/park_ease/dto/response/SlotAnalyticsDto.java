package com.natche.park_ease.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SlotAnalyticsDto {
    private String slotNumber;
    private Double value; // Can be Revenue (₹) or Time (Hrs)
    private Long bookingCount;
}