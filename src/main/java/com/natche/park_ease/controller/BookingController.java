package com.natche.park_ease.controller;

//not used

import com.natche.park_ease.dto.BookingRequest;
import com.natche.park_ease.entity.Booking;
import com.natche.park_ease.service.BookingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    @Autowired
    private BookingService bookingService;

    // 1. Create a Booking (Reserve or Park)
    @PostMapping("/create")
    public ResponseEntity<?> createBooking(@RequestBody BookingRequest request, Principal principal) {
        try {
            // principal.getName() is the email/phone from the JWT token
            Booking booking = bookingService.createBooking(request, principal.getName());
            
            // Returning the full entity for testing visibility
            // In production, map this to a BookingResponseDTO
            return ResponseEntity.ok(booking);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 2. Cancel / End Booking (HTTP Fallback for WebSocket)
    // Note: Usually we use WebSockets for arrival/exit to be real-time, 
    // but having an HTTP endpoint is good for testing via Postman.
    @PostMapping("/{bookingId}/end")
    public ResponseEntity<?> endBooking(@PathVariable Long bookingId, Principal principal) {
        try {
            Booking receipt = bookingService.endBookingAndPay(bookingId);
            return ResponseEntity.ok(receipt);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    // 3. Scan Arrival (HTTP Fallback)
    @PostMapping("/{bookingId}/arrive")
    public ResponseEntity<?> scanArrival(@PathVariable Long bookingId, Principal principal) {
        try {
            Booking updated = bookingService.handleArrival(bookingId);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}