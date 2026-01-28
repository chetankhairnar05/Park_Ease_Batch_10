package com.natche.park_ease.dto;

import com.natche.park_ease.enums.VehicleType;
import lombok.Data;

@Data
public class VehicleRegisterRequest {
    private String registerNumber; // License Plate
    private String model;          // e.g. Swift, City
    private String color;
    private VehicleType type;      // SMALL, MEDIUM, LARGE
    
    // Optional: User might want this to be their main car immediately
    private boolean isPrimary; 
    
    
}