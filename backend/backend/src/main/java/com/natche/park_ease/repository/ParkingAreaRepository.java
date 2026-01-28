package com.natche.park_ease.repository;
import com.natche.park_ease.dto.ParkingAreaDistanceProjection;
import com.natche.park_ease.entity.ParkingArea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ParkingAreaRepository extends JpaRepository<ParkingArea, Long> {

    // Find areas by Owner (for Admin/Guard dashboard)
    List<ParkingArea> findByAreaOwner_UserId(Long ownerId);
    
    // Find nearby areas (Simple name search, Geo-spatial requires native queries or Postgres/GIS)
    List<ParkingArea> findByNameContainingIgnoreCase(String name);

    //find all 
    List<ParkingArea> findAll();
    
    @Query(
    value = "SELECT p.area_id AS areaId, " +
            "p.name AS name, " +
            "p.address AS address, " +
            "p.latitude AS latitude, " +
            "p.longitude AS longitude, " +
            "(6371 * acos(cos(radians(:userLat)) * cos(radians(p.latitude)) * " +
            "cos(radians(p.longitude) - radians(:userLon)) + " +
            "sin(radians(:userLat)) * sin(radians(p.latitude)))) AS distance " +
            "FROM parking_areas p " +
            "ORDER BY distance ASC",
            nativeQuery = true
        )
    List<ParkingAreaDistanceProjection> findNearestAreas(@Param("userLat") Double userLat, @Param("userLon") Double userLon);

    
}
