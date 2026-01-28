package com.natche.park_ease.service;

import com.natche.park_ease.dto.BookingRequest;
import com.natche.park_ease.dto.response.BookingDto;
import com.natche.park_ease.entity.*;
import com.natche.park_ease.enums.*;
import com.natche.park_ease.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class BookingService {

    @Autowired private BookingRepository bookingRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ParkingSlotRepository slotRepository;
    @Autowired private ParkingAreaRepository areaRepository;
    @Autowired private VehicleRepository vehicleRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private OutstandingDueRepository dueRepository;
    @Autowired private SimpMessagingTemplate messagingTemplate;

    // ======================================================
    // 1. CREATE BOOKING
    // ======================================================
    @Transactional
    public Booking createBooking(BookingRequest request, String userEmail) {

        User user = userRepository.findByEmailOrPhone(userEmail, userEmail).orElseThrow();
        if (user.getIsBlocked()) throw new RuntimeException("Account Blocked. Please clear dues.");

        if (bookingRepository.findActiveBookingByVehicleId(request.getVehicleId()).isPresent()) { 
            throw new RuntimeException("Vehicle already in active booking.");
        }

        ParkingSlot slot = slotRepository.findById(request.getSlotId()).orElseThrow();
        ParkingArea area = slot.getParkingArea();

        if (slot.getStatus() != ParkingSlotStatus.AVAILABLE)
            throw new RuntimeException("Slot not available.");

        Double multiplier = area.getReservationRateMultipliers().get(1);

        Booking booking = Booking.builder()
                .user(user)
                .vehicle(vehicleRepository.getReferenceById(request.getVehicleId()))
                .slot(slot)
                .area(area)
                .bookingTime(LocalDateTime.now())
                .reservationTime(LocalDateTime.now())
                .status(request.getInitialStatus())
                .hourlyReservationRateSnapshot(slot.getBaseHourlyRate() * multiplier)
                .hourlyParkingRateSnapshot(slot.getBaseHourlyRate()).amountPaid(0.0).amountPending(0.0)
                .build();

        // FAST MODE (1 Real Second = 1 Virtual Minute)
        if (request.getInitialStatus() == BookingStatus.RESERVED) {
            // Expires in GracePeriod seconds
            booking.setExpectedEndTime(LocalDateTime.now().plusMinutes(area.getGracePeriodMinutes()));
            slot.setStatus(ParkingSlotStatus.RESERVED);
        } else {
            booking.setArrivalTime(LocalDateTime.now());
            booking.setExpectedEndTime(null);
            slot.setStatus(ParkingSlotStatus.OCCUPIED);
        }

        bookingRepository.save(booking);
        slotRepository.save(slot);

        broadcastSlotUpdate(slot, area.getAreaId());
        sendBookingUpdate(booking);

        return booking;
    }

    // ======================================================
    // 2. HANDLE ARRIVAL
    // ======================================================
    @Transactional
    public Booking handleArrival(Long bookingId) {

        Booking booking = bookingRepository.findById(bookingId).orElseThrow();
        if (booking.getStatus() != BookingStatus.RESERVED)
            throw new RuntimeException("Not reserved booking.");

        booking.setArrivalTime(LocalDateTime.now());

        // FAST MODE: Duration in Real Seconds = Virtual Minutes
        long virtualMinutesReserved = Duration.between(
                booking.getReservationTime(),
                booking.getArrivalTime()
        ).toMinutes();

        // 1. Check Waiver (e.g., 10 virtual mins)
        if (virtualMinutesReserved <= booking.getArea().getReservationWaiverMinutes()) {
            booking.setFinalReservationFee(0.0);
        } else {
            // 2. Calculate Exact Hours (Minutes / 60)
            // UPDATED: Removed Math.max(1.0, ...) to allow pro-rata billing (e.g. 0.5 hours)
            Double virtualHours = virtualMinutesReserved / 60.0;
            booking.setFinalReservationFee(virtualHours * booking.getHourlyReservationRateSnapshot());
        }

        booking.setStatus(BookingStatus.ACTIVE_PARKING);
        booking.getSlot().setStatus(ParkingSlotStatus.OCCUPIED);

        bookingRepository.save(booking);
        
        broadcastSlotUpdate(booking.getSlot(), booking.getArea().getAreaId());
        sendBookingUpdate(booking);

        return booking;
    }

    // ======================================================
    // 3. END BOOKING & PAY
    // ======================================================
    @Transactional
    public Booking endBookingAndPay(Long bookingId) {

        Booking booking = bookingRepository.findById(bookingId).orElseThrow();
        if (booking.getStatus() != BookingStatus.ACTIVE_PARKING)
            throw new RuntimeException("Booking not active.");

        booking.setDepartureTime(LocalDateTime.now());

        // FAST MODE: Duration in Seconds = Virtual Minutes
        long virtualMinutesParked = Duration.between(
                booking.getArrivalTime(),
                booking.getDepartureTime()
        ).toMinutes();

        // UPDATED: Removed Math.max(1.0, ...) to charge exactly for time used
        Double virtualHours = virtualMinutesParked / 60.0;
        booking.setFinalParkingFee(virtualHours * booking.getHourlyParkingRateSnapshot());

        Double currentBill = (booking.getFinalReservationFee() != null ? booking.getFinalReservationFee() : 0.0)
                         + booking.getFinalParkingFee();

        List<OutstandingDue> unpaidDues = dueRepository.findByUser_UserIdAndIsPaidFalse(booking.getUser().getUserId());
        Double oldDuesAmount = unpaidDues.stream().mapToDouble(OutstandingDue::getAmount).sum();

        Double grandTotal = currentBill + oldDuesAmount;

        User user = booking.getUser();
        Double walletBalance = user.getWalletBalance() != null ? user.getWalletBalance() : 0.0;

        Payment payment = Payment.builder()
                .user(user)
                .booking(booking)
                .amount(grandTotal)
                .isBookingPayment(true)
                .build();

        if (walletBalance >= grandTotal) {
            // SUCCESS
            user.setWalletBalance(walletBalance - grandTotal);
            payment.setMethod(PaymentMethod.WALLET);
            payment.setStatus(PaymentStatus.SUCCESS);



            booking.setStatus(BookingStatus.COMPLETED);
            booking.setAmountPaid(grandTotal);
            booking.setExitToken(UUID.randomUUID().toString());
            booking.getSlot().setStatus(ParkingSlotStatus.AVAILABLE);
            
            // Clear the Old Debt
            for (OutstandingDue due : unpaidDues) {
                //here we need to get that booking related to the outstanding due and set the amount pending to 0 and amount paid previous amount pending
               Booking oldBooking = due.getBooking();
                
                // We assume the user pays the debt amount
                Double debtAmount = due.getAmount();

                // Update Old Booking Financials
                // Paid = What was previously paid + What we just collected
                double prevPaid = oldBooking.getAmountPaid() != null ? oldBooking.getAmountPaid() : 0.0;
                oldBooking.setAmountPaid(prevPaid + debtAmount);
                oldBooking.setAmountPending(0.0);
                
                // If old booking was Defaulted/Cancelled, we can mark it completed or keep status as history
                // Usually financial fields are enough, but let's ensure it looks "Settled"
                // oldBooking.setStatus(BookingStatus.COMPLETED); // Optional, maybe keep CANCELLED_NO_SHOW as history

                bookingRepository.save(oldBooking);

                // Mark Due as Paid
                due.setIsPaid(true);
                dueRepository.save(due);
            }

        } else {
            // FAILED
            throw new RuntimeException("Insufficient Wallet Balance. Need: ₹" + String.format("%.2f", grandTotal));
        }

        userRepository.save(user);
        paymentRepository.save(payment);
        bookingRepository.save(booking);
        slotRepository.save(booking.getSlot());

        broadcastSlotUpdate(booking.getSlot(), booking.getArea().getAreaId());
        sendBookingUpdate(booking);

        return booking;
    }

    // ... Helpers ...
    private void broadcastSlotUpdate(ParkingSlot slot, Long areaId) {
        Map<String, Object> updateMsg = Map.of(
            "slotId", slot.getSlotId(),
            "slotNumber", slot.getSlotNumber(),
            "status", slot.getStatus(),
            "areaId", areaId
        );
        messagingTemplate.convertAndSend("/topic/area/" + areaId + "/slots", updateMsg);
    }

    private void sendBookingUpdate(Booking booking) {
        try {
            BookingDto dto = BookingDto.fromEntity(booking);
            messagingTemplate.convertAndSendToUser(
                booking.getUser().getEmail(), 
                "/queue/booking-updates", 
                dto
            );
        } catch (Exception e) {
            System.err.println("Failed to send WebSocket update: " + e.getMessage());
        }
    }
}