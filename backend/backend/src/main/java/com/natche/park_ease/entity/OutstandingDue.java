package com.natche.park_ease.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "outstanding_dues")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OutstandingDue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long dueId;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user; // The person liable for this specific debt

    @ManyToOne
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle; // The vehicle involved

    @OneToOne
    @JoinColumn(name = "booking_id")
    private Booking booking; // The booking that caused this debt

    private Double amount;

    private Boolean isPaid = false;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
    
    
}