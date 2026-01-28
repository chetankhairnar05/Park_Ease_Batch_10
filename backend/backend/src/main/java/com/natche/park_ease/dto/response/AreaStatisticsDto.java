package com.natche.park_ease.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AreaStatisticsDto {
    private Double totalEarnings;
    private Double totalPending; // Outstanding debts
    
    private Long completedBookings;
    private Long cancelledBookings;
    private Long totalBookings;
    private Long activeBookings; // Reserved + Occupied
    
    private Long uniqueUsers;
    private Long uniqueVehicles;
    
    private Double totalReservationHours; // In Virtual Hours
    private Double totalParkingHours;     // In Virtual Hours
}