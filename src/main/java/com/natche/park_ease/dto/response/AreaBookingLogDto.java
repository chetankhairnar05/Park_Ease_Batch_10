package com.natche.park_ease.dto.response;

import com.natche.park_ease.entity.Booking;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class AreaBookingLogDto {
    private Long bookingId;
    private String userName;
    private String userPhone;
    private String vehicleNumber;
    private String slotNumber;
    private String status;
    private LocalDateTime time; // When the booking happened
    private Double amount; // Paid or Pending

    public static AreaBookingLogDto fromEntity(Booking b) {
        String uName = b.getUser() != null ? b.getUser().getName() : "Unknown";
        String uPhone = b.getUser() != null ? b.getUser().getPhone() : "--";
        String vNum = b.getVehicle() != null ? b.getVehicle().getRegisterNumber() : "--";
        String sNum = b.getSlot() != null ? b.getSlot().getSlotNumber() : "--";
        
        // Get paid amount, fallback to pending debt if cancelled/defaulted
        Double amt = b.getAmountPaid() != null && b.getAmountPaid() > 0 
                     ? b.getAmountPaid() 
                     : (b.getAmountPending() != null ? b.getAmountPending() : 0.0);
        
        // Use Booking Time or Reservation Time
        LocalDateTime eventTime = b.getBookingTime(); 
        if(eventTime == null) eventTime = b.getReservationTime();

        return AreaBookingLogDto.builder()
                .bookingId(b.getId())
                .userName(uName)
                .userPhone(uPhone)
                .vehicleNumber(vNum)
                .slotNumber(sNum)
                .status(b.getStatus().name())
                .time(eventTime)
                .amount(amt)
                .build();
    }
}