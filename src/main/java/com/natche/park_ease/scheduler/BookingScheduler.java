package com.natche.park_ease.scheduler;

import com.natche.park_ease.dto.response.BookingDto;
import com.natche.park_ease.entity.Booking;
import com.natche.park_ease.entity.OutstandingDue;
import com.natche.park_ease.entity.Payment;
import com.natche.park_ease.entity.User;
import com.natche.park_ease.enums.BookingStatus;
import com.natche.park_ease.enums.ParkingSlotStatus;
import com.natche.park_ease.enums.PaymentMethod;
import com.natche.park_ease.enums.PaymentStatus;
import com.natche.park_ease.repository.BookingRepository;
import com.natche.park_ease.repository.OutstandingDueRepository;
import com.natche.park_ease.repository.ParkingSlotRepository;
import com.natche.park_ease.repository.PaymentRepository;
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
import java.util.Map;

@Component
@EnableScheduling
@DependsOn("entityManagerFactory") 
public class BookingScheduler {

    @Autowired private BookingRepository bookingRepository;
    @Autowired private OutstandingDueRepository dueRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ParkingSlotRepository slotRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private SimpMessagingTemplate messagingTemplate;

    // FAST MODE: Checks every 30 second
    @Scheduled(fixedRate = 30000)
    @Transactional
    public void checkExpiredReservations() {
        
        LocalDateTime now = LocalDateTime.now();

        List<Booking> expiredBookings = bookingRepository.findByStatusAndExpectedEndTimeBefore(
                BookingStatus.RESERVED, now
        );

        for (Booking booking : expiredBookings) {

            // 1. CALCULATE PENALTY (FAST MODE)
            long minutesWasted = Duration.between(
                    booking.getReservationTime(),
                    now
            ).toMinutes();

            
            double hours = minutesWasted / 60.0; 
            
            double penalty = hours * booking.getHourlyReservationRateSnapshot();

            booking.setAmountPending(penalty);
            booking.setFinalParkingFee(0.0);
            booking.setFinalReservationFee(penalty);
            booking.setStatus(BookingStatus.CANCELLED_NO_SHOW);

            // 2. FREE SLOT
            booking.getSlot().setStatus(ParkingSlotStatus.AVAILABLE);
            slotRepository.save(booking.getSlot());

            // 3. FINANCIALS
            User user = booking.getUser();
            String msgDetail;

            if (user.getWalletBalance() != null && user.getWalletBalance() >= penalty) {
                user.setWalletBalance(user.getWalletBalance() - penalty);
                booking.setAmountPaid(penalty);
                booking.setAmountPending(0.0);
                msgDetail = "Penalty Deducted from Wallet.";

                Payment payment = Payment.builder()
                        .user(user)
                        .booking(booking)
                        .amount(penalty)
                        .method(PaymentMethod.WALLET)
                        .status(PaymentStatus.SUCCESS)
                        .isBookingPayment(true) 
                        .build();
                paymentRepository.save(payment);

            } else {
                OutstandingDue due = OutstandingDue.builder()
                        .user(user)
                        .vehicle(booking.getVehicle())
                        .booking(booking)
                        .amount(penalty)
                        .isPaid(false)
                        .build();

                dueRepository.save(due);
                msgDetail = "Insufficient funds. Added to Outstanding Dues.";
            }

            bookingRepository.save(booking);
            userRepository.save(user);

            // 4. NOTIFY USER (Data + Text)
            sendBookingUpdate(booking); // <--- THIS WAS MISSING
            
            try {
                messagingTemplate.convertAndSendToUser(
                        user.getEmail(),
                        "/queue/notifications",
                        "Booking Cancelled (No-Show). Penalty: ₹" + String.format("%.2f", penalty) + ". " + msgDetail
                );
            } catch (Exception e) {
                // Ignore send errors
            }
        }
    }

    // Helper to send DTO to frontend so it refreshes
    private void sendBookingUpdate(Booking booking) {
        try {
            BookingDto dto = BookingDto.fromEntity(booking);
            System.out.print("helo wold");
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