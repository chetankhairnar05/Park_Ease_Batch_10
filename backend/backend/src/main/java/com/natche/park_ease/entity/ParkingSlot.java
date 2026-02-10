package com.natche.park_ease.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.natche.park_ease.enums.ParkingSlotStatus;
import com.natche.park_ease.enums.VehicleType;
import jakarta.persistence.*;
import lombok.*;

/**
 * Database entity representing an individual parking slot within a parking area.
 * Captures supported vehicle type, current availability status, and base pricing,
 * with optimistic locking to prevent double booking.
 */
@Entity
@Table(name = "parking_slots")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParkingSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long slotId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "area_id", nullable = false)
    @JsonBackReference
    private ParkingArea parkingArea;

    private String slotNumber; // e.g., A-101
    private int floor;

    @Enumerated(EnumType.STRING)
    private VehicleType supportedVehicleType;

    @Enumerated(EnumType.STRING)
    private ParkingSlotStatus status;

    private Double baseHourlyRate; 

    // Optimistic Locking to prevent double booking
    @Version
    @JsonIgnore
    private Integer version; 
}
