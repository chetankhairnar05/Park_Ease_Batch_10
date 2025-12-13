package com.natche.park_ease.repository;

import com.natche.park_ease.entity.Guard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface GuardRepository extends JpaRepository<Guard, Long> {
    
    // Find guard details by their User ID
    Optional<Guard> findByUser_UserId(Long userId);
    
    // Find all guards working in a specific Area
    List<Guard> findByParkingArea_AreaId(Long areaId);
}