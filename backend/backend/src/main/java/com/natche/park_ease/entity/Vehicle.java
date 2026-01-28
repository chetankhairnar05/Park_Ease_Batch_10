package com.natche.park_ease.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.natche.park_ease.enums.VehicleType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "vehicles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long vehicleId;

    @Column(unique = true, nullable = false)
    private String registerNumber;

    @Enumerated(EnumType.STRING)
    private VehicleType vehicleType;

    private String color;
    private String model;
    

    // Link to the creator (Original Owner)
    @ManyToOne
    @JoinColumn(name = "created_by_user_id")
    @JsonBackReference
    private User createdBy;
}