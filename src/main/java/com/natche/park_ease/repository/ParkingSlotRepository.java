package com.natche.park_ease.repository;
import com.natche.park_ease.entity.ParkingSlot;
import com.natche.park_ease.enums.ParkingSlotStatus;
import com.natche.park_ease.enums.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
// import org.springframework.data.jpa.repository.Query;
// import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ParkingSlotRepository extends JpaRepository<ParkingSlot, Long> {

    // Find all available slots in an area
    List<ParkingSlot> findByParkingArea_AreaIdAndStatus(Long areaId, ParkingSlotStatus status);

    // Find slots compatible with specific vehicle type
    List<ParkingSlot> findByParkingArea_AreaIdAndSupportedVehicleTypeAndStatus(Long areaId, VehicleType type, ParkingSlotStatus status);

    // Count occupancy for dynamic pricing logic
    long countByParkingArea_AreaIdAndStatus(Long areaId, ParkingSlotStatus status);

    // Find specific slot (e.g., "A-101" in "City Mall")
    ParkingSlot findByParkingArea_AreaIdAndSlotNumber(Long areaId, String slotNumber);
    // NEW: Needed for "Disable Area" feature
    List<ParkingSlot> findByParkingArea_AreaId(Long areaId);

    @Query("SELECT s.supportedVehicleType, COUNT(s) " +
           "FROM ParkingSlot s " +
           "WHERE s.parkingArea.areaId = :areaId " +
           "AND s.status = 'AVAILABLE' " +
           "GROUP BY s.supportedVehicleType")
    List<Object[]> countAvailableSlotsGroupedByType(@Param("areaId") Long areaId);

    
}

