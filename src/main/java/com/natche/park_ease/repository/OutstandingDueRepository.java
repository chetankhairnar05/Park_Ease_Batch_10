package com.natche.park_ease.repository;

import com.natche.park_ease.entity.OutstandingDue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OutstandingDueRepository extends JpaRepository<OutstandingDue, Long> {

    // Get all UNPAID dues for a user
    List<OutstandingDue> findByUser_UserIdAndIsPaidFalse(Long userId);

    // Calculate TOTAL Pending Amount (The Rapido Debt Logic)
    // Returns null if no dues, so assume 0.0 in service layer
    @Query("SELECT SUM(o.amount) FROM OutstandingDue o WHERE o.user.userId = :userId AND o.isPaid = false")
    Double getTotalPendingDuesByUserId(@Param("userId") Long userId);


    @Query("SELECT COALESCE(SUM(o.amount), 0) FROM OutstandingDue o WHERE o.vehicle.vehicleId = :vehId AND o.isPaid = false")
    Double sumDuesByVehicleId(@Param("vehId") Long vehId);

    @Query("SELECT COALESCE(SUM(o.amount), 0) FROM OutstandingDue o WHERE o.user.userId = :userId AND o.vehicle.vehicleId = :vehId AND o.isPaid = false")
    Double sumDuesByUserAndVehicle(@Param("userId") Long userId, @Param("vehId") Long vehId);
}
