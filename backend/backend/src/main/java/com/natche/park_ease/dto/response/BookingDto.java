package com.natche.park_ease.dto.response;

import com.natche.park_ease.entity.Booking;
import com.natche.park_ease.enums.BookingStatus;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BookingDto {
    private Long id;
    private Long vehicleId;
    private Long slotId;
    private Long areaId;
    private Long userId;
    
    private String slotNumber;
    private String areaName;
    private String vehicleNumber;
    
    private BookingStatus status;
    private LocalDateTime reservationTime;
    private LocalDateTime arrivalTime;
    private LocalDateTime expectedArrivalTime;
    private LocalDateTime departureTime;
    
    private Double amountPaid;
    private Double finalParkingFee;

        // ✅ NEW FIELDS REQUIRED FOR HISTORY
    private Double amountPending;
    private Double finalReservationFee;

    public static BookingDto fromEntity(Booking booking) {
        BookingDto dto = new BookingDto();

        dto.setId(booking.getId());
        dto.setStatus(booking.getStatus());
        dto.setReservationTime(booking.getReservationTime());
        dto.setArrivalTime(booking.getArrivalTime());
        dto.setDepartureTime(booking.getDepartureTime());
        dto.setAmountPaid(booking.getAmountPaid());
        dto.setFinalParkingFee(booking.getFinalParkingFee());
        dto.setExpectedArrivalTime(booking.getExpectedEndTime());
        dto.setAmountPending(booking.getAmountPending());
        dto.setFinalReservationFee(booking.getFinalReservationFee());



        // Map IDs safely
        if (booking.getVehicle() != null) {
            dto.setVehicleId(booking.getVehicle().getVehicleId());
            dto.setVehicleNumber(booking.getVehicle().getRegisterNumber());
        }
        if (booking.getSlot() != null) {
            dto.setSlotId(booking.getSlot().getSlotId());
            dto.setSlotNumber(booking.getSlot().getSlotNumber());
        }
        if (booking.getArea() != null) {
            dto.setAreaId(booking.getArea().getAreaId());
            dto.setAreaName(booking.getArea().getName());
        }
        if (booking.getUser() != null) {
            dto.setUserId(booking.getUser().getUserId());
        }
        
        return dto;
    }
}