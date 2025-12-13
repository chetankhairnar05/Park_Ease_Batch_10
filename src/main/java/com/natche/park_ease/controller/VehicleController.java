package com.natche.park_ease.controller;
//user can register a vehicle and set primary vehicle among multiple vehicles he owns
import com.natche.park_ease.dto.VehicleRegisterRequest;
import com.natche.park_ease.dto.response.VehicleResponseDto;
import com.natche.park_ease.entity.User;
import com.natche.park_ease.entity.Vehicle;
import com.natche.park_ease.repository.UserRepository;
import com.natche.park_ease.service.VehicleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VehicleService vehicleService;

    // POST /api/vehicles/register
    // In VehicleController.java
@PostMapping("/register")
public ResponseEntity<?> registerVehicle(@RequestBody VehicleRegisterRequest request, Principal principal) {
    try {
        Vehicle vehicle = vehicleService.registerVehicle(request, principal.getName());
        
        // Convert Entity -> DTO before returning
        VehicleResponseDto response = VehicleResponseDto.fromEntity(vehicle);
        
        return ResponseEntity.ok(response);
    } catch (RuntimeException e) {
        return ResponseEntity.badRequest().body(e.getMessage());
    }
}

    // PUT /api/vehicles/{id}/set-primary
    @PutMapping("/{vehicleId}/set-primary")
    public ResponseEntity<?> setPrimaryVehicle(@PathVariable Long vehicleId, Principal principal) {
        // We need to fetch User ID from email (Principal) - In a real app, use a Helper Service
        // For now, assuming you have a way to get UserID or Service handles email lookup
        // Let's assume VehicleService can handle email lookup (Updated Service method below)
        User user = userRepository.findByEmailOrPhone(principal.getName(), principal.getName()).orElseThrow();
        vehicleService.setPrimaryVehicle(vehicleId,user.getUserId());
        return ResponseEntity.ok("Primary vehicle updated"); 
    }

}

