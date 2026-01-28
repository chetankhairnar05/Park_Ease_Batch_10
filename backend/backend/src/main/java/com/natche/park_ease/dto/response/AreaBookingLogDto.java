package com.natche.park_ease.dto.response;

import com.natche.park_ease.entity.Booking;
import com.natche.park_ease.enums.BookingStatus;

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
    private LocalDateTime time2; // When the booking ended
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
        // Use Booking Time or Reservation Time
        LocalDateTime eventTime2 ;
        if(b.getStatus() == BookingStatus.COMPLETED) {
            eventTime2 = b.getDepartureTime();
        } else if (b.getStatus()==BookingStatus.CANCELLED_NO_SHOW) {
            eventTime2 = b.getExpectedEndTime();
        }else{
            eventTime2 = null;
        }

        return AreaBookingLogDto.builder()
                .bookingId(b.getId())
                .userName(uName)
                .userPhone(uPhone)
                .vehicleNumber(vNum)
                .slotNumber(sNum)
                .status(b.getStatus().name())
                .time(eventTime)
                .time2(eventTime2)
                .amount(amt)
                .build();
    }
}