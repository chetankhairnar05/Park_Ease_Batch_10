package com.natche.park_ease.service;

import com.natche.park_ease.dto.VehicleRegisterRequest;
import com.natche.park_ease.entity.User;
import com.natche.park_ease.entity.UserVehicleAccess;
import com.natche.park_ease.entity.Vehicle;
import com.natche.park_ease.enums.UserVehicleAccessRole;
import com.natche.park_ease.repository.UserRepository;
import com.natche.park_ease.repository.UserVehicleAccessRepository;
import com.natche.park_ease.repository.VehicleRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;


@Service
public class VehicleService {

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private UserVehicleAccessRepository accessRepository;

    @Autowired
    private UserRepository userRepository;

    // --- 1. REGISTER VEHICLE ---
    @Transactional // Ensures both Vehicle and Access are saved, or neither
    public Vehicle registerVehicle(VehicleRegisterRequest request, String userEmailOrPhone) {

        // A. Check if Vehicle already exists globally (Unique Plate)
        if (vehicleRepository.findByRegisterNumber(request.getRegisterNumber()).isPresent()) {
            throw new RuntimeException("Vehicle with this register number already exists.");
        }

        User user = userRepository.findByEmailOrPhone(userEmailOrPhone, userEmailOrPhone)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // B. Handle "Default Location" logic
       

        // C. Create Vehicle Entity
        Vehicle vehicle = Vehicle.builder()
                .registerNumber(request.getRegisterNumber().toUpperCase()) // Standardize to Uppercase
                .model(request.getModel())
                .color(request.getColor())
                .vehicleType(request.getType())
                
                .createdBy(user) // Set Creator
                .build();

        Vehicle savedVehicle = vehicleRepository.save(vehicle);

        // D. Create "OWNER" Access
        UserVehicleAccess access = UserVehicleAccess.builder()
                .user(user)
                .vehicle(savedVehicle)
                .role(UserVehicleAccessRole.OWNER)
                .isEnabled(true)
                .isPrimary(false) // We handle this logic next
                .build();

        accessRepository.save(access);

        // E. Handle Primary Logic
        if (request.isPrimary()) {
            setPrimaryVehicle(user.getUserId(), savedVehicle.getVehicleId());
        } else {
            // If this is their FIRST ever car, make it primary automatically
            List<UserVehicleAccess> myVehicles = accessRepository.findByUser_UserId(user.getUserId());
            if (myVehicles.size() == 1) {
                setPrimaryVehicle(user.getUserId(), savedVehicle.getVehicleId());
            }
        }

        return savedVehicle;
    }

    // --- 2. SET PRIMARY VEHICLE (The "Toggle" Logic) ---
    @Transactional
    public void setPrimaryVehicle(Long userId, Long vehicleId) {
        // Step 1: Unset 'isPrimary' for ALL vehicles this user has access to
        List<UserVehicleAccess> allAccess = accessRepository.findByUser_UserId(userId);
        for (UserVehicleAccess access : allAccess) {
            access.setIsPrimary(false);
            accessRepository.save(access);
        }

        // Step 2: Set 'isPrimary' for the specific target vehicle
        UserVehicleAccess targetAccess = allAccess.stream()
                .filter(a -> a.getVehicle().getVehicleId().equals(vehicleId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("You do not have access to this vehicle"));

        targetAccess.setIsPrimary(true);
        accessRepository.save(targetAccess);
    }
}