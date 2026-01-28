package com.natche.park_ease.repository;

import com.natche.park_ease.entity.Booking;
import com.natche.park_ease.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    // 1. Fetch History for User
    List<Booking> findByUser_UserIdOrderByReservationTimeDesc(Long userId);

    // 2. Fetch Active Booking for User (To prevent multiple active bookings)
    @Query("SELECT b FROM Booking b WHERE b.user.userId = :userId AND b.status IN ('RESERVED', 'ACTIVE_PARKING', 'PAYMENT_PENDING')")
    Optional<Booking> findActiveBookingByUser(@Param("userId") Long userId);

      @Query("SELECT b FROM Booking b WHERE b.vehicle.vehicleId = :vehicleId AND b.status IN ('RESERVED', 'ACTIVE_PARKING', 'PAYMENT_PENDING')")
    Optional<Booking> findActiveBookingByVehicleId(@Param("vehicleId") Long vehicleId);


    // 3. For Guard: Find booking by Vehicle Plate (if they scan plate)
    @Query("SELECT b FROM Booking b WHERE b.vehicle.registerNumber = :plate AND b.status IN ('RESERVED', 'ACTIVE_PARKING', 'PAYMENT_PENDING')")
    Optional<Booking> findActiveBookingByLicensePlate(@Param("plate") String plate);

    // 4. For CRON JOB: Find expired reservations (No-Shows)
    // "Find bookings that are RESERVED and ExpectedEndTime is BEFORE Now"
    List<Booking> findByStatusAndExpectedEndTimeBefore(BookingStatus status, LocalDateTime now);

    @Query("SELECT COUNT(b) > 0 FROM Booking b " +
       "WHERE b.vehicle.vehicleId = :vehicleId " +
       "AND b.status IN ('RESERVED', 'ACTIVE_PARKING', 'PAYMENT_PENDING')")
boolean isVehicleCurrentlyBusy(@Param("vehicleId") Long vehicleId);

    // ✅ NEW: Find ALL active bookings (List)
    List<Booking> findByUser_UserIdAndStatusIn(Long userId, Collection<BookingStatus> statuses);


     // 5. Find all bookings for a specific area (For Owner Analytics)
    List<Booking> findByArea_AreaId(Long areaId);

}
