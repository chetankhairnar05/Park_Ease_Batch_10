package com.natche.park_ease.service;

import com.natche.park_ease.dto.BookingRequest;
import com.natche.park_ease.entity.*;
import com.natche.park_ease.enums.*;
import com.natche.park_ease.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
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
        if (user.getIsBlocked()) throw new RuntimeException("Account Blocked.");

        if (bookingRepository.findActiveBookingByLicensePlate(request.getVehicleId().toString()).isPresent()) {
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
                .hourlyParkingRateSnapshot(slot.getBaseHourlyRate())
                .build();

        // ORIGINAL LOGIC (minutes):
        // if (request.getInitialStatus() == BookingStatus.RESERVED) {
        //     booking.setExpectedEndTime(LocalDateTime.now().plusMinutes(area.getGracePeriodMinutes()));
        //     slot.setStatus(ParkingSlotStatus.RESERVED);
        // }

        // FAST MODE (seconds):
        if (request.getInitialStatus() == BookingStatus.RESERVED) {
            booking.setExpectedEndTime(LocalDateTime.now().plusSeconds(area.getGracePeriodMinutes()));
            slot.setStatus(ParkingSlotStatus.RESERVED);
        } else {
            booking.setArrivalTime(LocalDateTime.now());
            booking.setExpectedEndTime(null);
            slot.setStatus(ParkingSlotStatus.OCCUPIED);
        }

        bookingRepository.save(booking);
        slotRepository.save(slot);

        messagingTemplate.convertAndSend("/topic/area/" + area.getAreaId() + "/slots",
                "Slot " + slot.getSlotNumber() + " updated");

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

        // ORIGINAL (minutes):
        // long minutesReserved = Duration.between(booking.getReservationTime(), booking.getArrivalTime()).toMinutes();
        // if (minutesReserved <= booking.getArea().getReservationWaiverMinutes()) { ... }

        // FAST MODE (seconds):
        long minutesReserved = Duration.between(
                booking.getReservationTime(),
                booking.getArrivalTime()
        ).toSeconds();

        if (minutesReserved <= booking.getArea().getReservationWaiverMinutes()) {
            booking.setFinalReservationFee(0.0);
        } else {
            Double hours = Math.max(1.0, minutesReserved / 60.0);
            booking.setFinalReservationFee(hours * booking.getHourlyReservationRateSnapshot());
        }

        booking.setStatus(BookingStatus.ACTIVE_PARKING);
        booking.getSlot().setStatus(ParkingSlotStatus.OCCUPIED);

        return bookingRepository.save(booking);
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

        // ORIGINAL:
        // long minutesParked = Duration.between(booking.getArrivalTime(), booking.getDepartureTime()).toMinutes();

        // FAST MODE:
        long minutesParked = Duration.between(
                booking.getArrivalTime(),
                booking.getDepartureTime()
        ).toSeconds();

        Double hours = Math.max(1.0, minutesParked / 60.0);
        booking.setFinalParkingFee(hours * booking.getHourlyParkingRateSnapshot());

        Double totalBill =
                (booking.getFinalReservationFee() != null ? booking.getFinalReservationFee() : 0.0)
                        + booking.getFinalParkingFee();

        Double dues = dueRepository.getTotalPendingDuesByUserId(booking.getUser().getUserId());
        if (dues == null) dues = 0.0;

        Double grandTotal = totalBill + dues;

        User user = booking.getUser();

        Payment payment = Payment.builder()
                .user(user)
                .booking(booking)
                .amount(grandTotal)
                .isBookingPayment(true)
                .build();

        if (user.getWalletBalance() >= grandTotal) {

            user.setWalletBalance(user.getWalletBalance() - grandTotal);
            payment.setMethod(PaymentMethod.WALLET);
            payment.setStatus(PaymentStatus.SUCCESS);

            booking.setStatus(BookingStatus.COMPLETED);
            booking.setAmountPaid(grandTotal);
            booking.setExitToken(UUID.randomUUID().toString());
            booking.getSlot().setStatus(ParkingSlotStatus.AVAILABLE);

        } else {
            throw new RuntimeException("Insufficient Wallet Balance. Need: " + grandTotal);
        }

        userRepository.save(user);
        paymentRepository.save(payment);

        return bookingRepository.save(booking);
    }
}
