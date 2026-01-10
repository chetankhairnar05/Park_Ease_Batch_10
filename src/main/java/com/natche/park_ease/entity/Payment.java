package com.natche.park_ease.entity;

import com.natche.park_ease.enums.PaymentMethod;
import com.natche.park_ease.enums.PaymentStatus;
// import com.natche.parking.enums.PaymentType;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long paymentId;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user; 

    @ManyToOne
    @JoinColumn(name = "booking_id", nullable = true) // Nullable for Top-ups
    private Booking booking;

    private Double amount;

    @Enumerated(EnumType.STRING)
    private PaymentMethod method;

    
    private Boolean isBookingPayment; // NEW ENUM: BOOKING_PAYMENT, WALLET_TOPUP

    @Enumerated(EnumType.STRING)
    private PaymentStatus status;


    @CreationTimestamp
    private LocalDateTime timestamp;
}
/*
Booking Payment: type = BOOKING_PAYMENT, booking = (id).

Wallet Top-up: type = WALLET_TOPUP, booking = null.

Effect: If status == SUCCESS, we execute user.setWalletBalance(user.getWalletBalance() + amount).
*/