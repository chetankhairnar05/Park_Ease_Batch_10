package com.natche.park_ease.repository;

import com.natche.park_ease.entity.UserVehicleAccess;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserVehicleAccessRepository extends JpaRepository<UserVehicleAccess, Long> {

    // Get all vehicles a user has access to (Owned + Shared)
    List<UserVehicleAccess> findByUser_UserId(Long userId);

    // Get who has access to a specific vehicle
    List<UserVehicleAccess> findByVehicle_VehicleId(Long vehicleId);

    // Find the 'Primary' vehicle for a user (for auto-selection in UI)
    Optional<UserVehicleAccess> findByUser_UserIdAndIsPrimaryTrue(Long userId);
    
    // Check if specific access exists
    boolean existsByUser_UserIdAndVehicle_VehicleId(Long userId, Long vehicleId);
}
