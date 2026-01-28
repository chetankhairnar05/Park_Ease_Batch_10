


package com.natche.park_ease.controller;

import com.natche.park_ease.dto.BookingRequest;
import com.natche.park_ease.dto.response.BookingDto; // Import DTO
import com.natche.park_ease.entity.Booking;
import com.natche.park_ease.entity.User;
import com.natche.park_ease.enums.BookingStatus;
import com.natche.park_ease.repository.BookingRepository;
import com.natche.park_ease.repository.UserRepository;
import com.natche.park_ease.service.BookingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    @Autowired
    private BookingService bookingService;
    @Autowired
    private BookingRepository bookingRepository;
    @Autowired
    private UserRepository userRepository;

    // 1. Create a Booking
    @PostMapping("/create")
    public ResponseEntity<?> createBooking(@RequestBody BookingRequest request, Principal principal) {
        try {
            Booking booking = bookingService.createBooking(request, principal.getName());
            
            // ✅ FIX: Convert to DTO
            return ResponseEntity.ok(BookingDto.fromEntity(booking));
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 2. End Booking
    @PostMapping("/{bookingId}/end")
    public ResponseEntity<?> endBooking(@PathVariable Long bookingId, Principal principal) {
        try {
            Booking receipt = bookingService.endBookingAndPay(bookingId);
            
            // ✅ FIX: Convert to DTO
            return ResponseEntity.ok(BookingDto.fromEntity(receipt));
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    // 3. Scan Arrival
    @PostMapping("/{bookingId}/arrive")
    public ResponseEntity<?> scanArrival(@PathVariable Long bookingId, Principal principal) {
        try {
            Booking updated = bookingService.handleArrival(bookingId);
            
            // ✅ FIX: Convert to DTO
            return ResponseEntity.ok(BookingDto.fromEntity(updated));
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 4. Get Active Booking
    @GetMapping("/active")
    public ResponseEntity<?> getActiveBooking(Principal principal) {
        User user = userRepository.findByEmailOrPhone(principal.getName(), principal.getName()).orElseThrow();
        
        return bookingRepository.findActiveBookingByUser(user.getUserId())
                // ✅ FIX: Map to DTO if present
                .map(BookingDto::fromEntity)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

     @GetMapping("/list/active")
    public ResponseEntity<List<BookingDto>> getAllActiveBookings(Principal principal) {
        User user = userRepository.findByEmailOrPhone(principal.getName(), principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Booking> bookings = bookingRepository.findByUser_UserIdAndStatusIn(
                user.getUserId(),
                Arrays.asList(BookingStatus.RESERVED, BookingStatus.ACTIVE_PARKING, BookingStatus.PAYMENT_PENDING)
        );

        // Convert to DTOs to avoid recursion/serialization errors
        List<BookingDto> dtos = bookings.stream()
                .map(BookingDto::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/list/history")
    public ResponseEntity<List<BookingDto>> getBookingHistory(Principal principal) {
        User user = userRepository.findByEmailOrPhone(principal.getName(), principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Booking> history = bookingRepository.findByUser_UserIdAndStatusIn(
                user.getUserId(),
                Arrays.asList(BookingStatus.COMPLETED, BookingStatus.CANCELLED_NO_SHOW, BookingStatus.DEFAULTED)
        );

        List<BookingDto> dtos = history.stream()
                .map(BookingDto::fromEntity)
                // Sort by ID descending (newest first)
                .sorted((a, b) -> b.getId().compareTo(a.getId()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }
}