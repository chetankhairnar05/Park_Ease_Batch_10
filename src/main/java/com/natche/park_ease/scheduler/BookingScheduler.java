package com.natche.park_ease.scheduler;

import com.natche.park_ease.entity.Booking;
import com.natche.park_ease.entity.OutstandingDue;
import com.natche.park_ease.entity.User;
import com.natche.park_ease.enums.BookingStatus;
import com.natche.park_ease.enums.ParkingSlotStatus;
import com.natche.park_ease.repository.BookingRepository;
import com.natche.park_ease.repository.OutstandingDueRepository;
import com.natche.park_ease.repository.ParkingSlotRepository;
import com.natche.park_ease.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.DependsOn;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Component
@EnableScheduling
@DependsOn("entityManagerFactory") 
public class BookingScheduler {

    @Autowired private BookingRepository bookingRepository;
    @Autowired private OutstandingDueRepository dueRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ParkingSlotRepository slotRepository;
    @Autowired private SimpMessagingTemplate messagingTemplate;

    // ======================================================
    // ⏰ RUNS EVERY 1 SECOND (REAL-TIME EXPIRATION)
    // ======================================================
    // ORIGINAL (every 1 minute):
    // @Scheduled(fixedRate = 60000)

    // FAST MODE (every 1 second):
    @Scheduled(fixedRate = 1000)
    // @Scheduled(fixedRate = 1000000)
    @Transactional
    public void checkExpiredReservations() {
        

        LocalDateTime now = LocalDateTime.now();

        // Fetch all reservations that have crossed expectedEndTime
        List<Booking> expiredBookings =
                bookingRepository.findByStatusAndExpectedEndTimeBefore(
                        BookingStatus.RESERVED,
                        now
                );

        for (Booking booking : expiredBookings) {

            // ======================================================
            // 1. CALCULATE PENALTY
            // ======================================================

            // ORIGINAL (minutes):
            // long minutesWasted = Duration.between(booking.getReservationTime(), now).toMinutes();
            // Double hours = Math.max(0.5, minutesWasted / 60.0);

            // FAST MODE (seconds):
            long secondsWasted = Duration.between(
                    booking.getReservationTime(),
                    now
            ).toSeconds();

            double hours = Math.max(0.5, secondsWasted / 3600.0);
            double penalty = hours * booking.getHourlyReservationRateSnapshot();

            booking.setAmountPending(penalty);
            booking.setFinalParkingFee(0.0);
            booking.setFinalReservationFee(penalty);
            booking.setStatus(BookingStatus.CANCELLED_NO_SHOW);

            // ======================================================
            // 2. FREE SLOT
            // ======================================================
            booking.getSlot().setStatus(ParkingSlotStatus.AVAILABLE);
            slotRepository.save(booking.getSlot());

            // ======================================================
            // 3. WALLET DEDUCTION OR CREATE OUTSTANDING DUE
            // ======================================================
            User user = booking.getUser();

            if (user.getWalletBalance()!=null&&user.getWalletBalance() >= penalty) {

                user.setWalletBalance(user.getWalletBalance() - penalty);
                booking.setAmountPaid(penalty);
                booking.setAmountPending(0.0);



            } else {

                OutstandingDue due = OutstandingDue.builder()
                        .user(user)
                        .vehicle(booking.getVehicle())
                        .booking(booking)
                        .amount(penalty)
                        .isPaid(false)
                        .build();

                dueRepository.save(due);
            }

            bookingRepository.save(booking);
            userRepository.save(user);

            // ======================================================
            // 4. NOTIFY USER
            // ======================================================
            messagingTemplate.convertAndSendToUser(
                    user.getEmail(),
                    "/queue/notifications",
                    "Booking Cancelled due to No-Show. Penalty: " + penalty
            );
        }
    }
}
