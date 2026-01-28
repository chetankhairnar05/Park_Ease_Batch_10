package com.natche.park_ease.repository;
import com.natche.park_ease.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    
    // Find all payments for a specific booking
    List<Payment> findByBooking_Id(Long bookingId);
}
