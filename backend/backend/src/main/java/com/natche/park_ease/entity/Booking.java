package com.natche.park_ease.entity;


import com.natche.park_ease.enums.BookingStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "bookings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "slot_id")
    private ParkingSlot slot;

    @ManyToOne
    @JoinColumn(name = "area_id")
    private ParkingArea area;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Payment> payments;

    // Timestamps
    private LocalDateTime reservationTime; // When user clicked "Book"
    private LocalDateTime arrivalTime;     // When QR Scanned
    private LocalDateTime departureTime;   // When Exit Requested
    private LocalDateTime expectedEndTime; // reservationTime + gracePeriod

    @Enumerated(EnumType.STRING)
    private BookingStatus status;

    private LocalDateTime bookingTime;  // The time when booking was created

    // Financials
    private Double amountPaid = 0.0;
    private Double amountPending = 0.0; // Calculated final bill

    // Rate Snapshots (Rates might change later, but this booking locks these rates)
    private Double hourlyReservationRateSnapshot; 
    private Double hourlyParkingRateSnapshot;

    // Final Calculated Components
    private Double finalReservationFee;
    private Double finalParkingFee;
    
    // Security Token
    private String exitToken; // Generated after payment
}
