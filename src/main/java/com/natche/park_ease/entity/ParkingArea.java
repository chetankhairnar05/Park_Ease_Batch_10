package com.natche.park_ease.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonManagedReference;

@Entity
@Table(name = "parking_areas")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParkingArea {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long areaId;

    private String name;
    
    private int capacitySmall;
    private int capacityMedium;
    private int capacityLarge;

    // Location
    private String latitude;
    private String longitude;
    private String address;

    @OneToMany(mappedBy = "parkingArea", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference
   
    private List<ParkingSlot> slots;

    // --- Dynamic Pricing Configuration (Moved here from Slot) ---
    
    // Stores multipliers like [1.0, 1.35, 1.65, 2.0]
    @ElementCollection
    private List<Double> reservationRateMultipliers = new ArrayList<>(); 

    // Current demand index (pointer to the multiplier list)
    private int currentRateIndexSmall = 0;
    private int currentRateIndexMedium = 0;
    private int currentRateIndexLarge = 0;

    // Occupancy Counters
    private int occupancySmall = 0;
    private int occupancyMedium = 0;
    private int occupancyLarge = 0;

    // Policy Configurations
    private Integer gracePeriodMinutes = 30; // Max time to hold reservation
    private Integer reservationWaiverMinutes = 10; // Free if arrived within 10 mins


    @ManyToOne
    @JoinColumn(name = "owner_id")
    private User areaOwner; // Assigned by Admin
    
    // // Link to Guards
    @OneToMany(mappedBy = "parkingArea")
    private List<Guard> guards;

    
}