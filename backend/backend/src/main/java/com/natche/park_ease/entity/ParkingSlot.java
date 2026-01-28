package com.natche.park_ease.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.natche.park_ease.enums.ParkingSlotStatus;
import com.natche.park_ease.enums.VehicleType;
import jakarta.persistence.*;
import lombok.*;

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