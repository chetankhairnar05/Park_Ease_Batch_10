package com.natche.park_ease.repository;

import com.natche.park_ease.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    // Find specific vehicle by plate (Unique)
    Optional<Vehicle> findByRegisterNumber(String registerNumber);

    // Find all vehicles created by a specific user
    List<Vehicle> findByCreatedBy_UserId(Long userId);
}
