package com.natche.park_ease.dto;

import com.natche.park_ease.enums.BookingStatus;
import lombok.Data;

@Data
public class BookingRequest {
    // We get User ID from the Principal (Token)
    private Long vehicleId;
    private Long slotId;
    private Long areaId;
    
    // User declares intent: "RESERVED" (Booking from home) or "ACTIVE_PARKING" (Scanning QR at spot)
    private BookingStatus initialStatus; 
    
    // Optional: User location to verify they aren't cheating (fake arrivals)
    private String latitude;
    private String longitude;
}