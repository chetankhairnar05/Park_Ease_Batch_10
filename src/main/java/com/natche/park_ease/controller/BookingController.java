// package com.natche.park_ease.controller;

// //not used

// import com.natche.park_ease.dto.BookingRequest;
// import com.natche.park_ease.entity.Booking;
// import com.natche.park_ease.entity.User;
// import com.natche.park_ease.repository.BookingRepository;
// import com.natche.park_ease.repository.UserRepository;
// import com.natche.park_ease.service.BookingService;
// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.http.ResponseEntity;
// import org.springframework.web.bind.annotation.*;

// import java.security.Principal;
// import java.util.Map;

// @RestController
// @RequestMapping("/api/bookings")
// public class BookingController {

//     @Autowired
//     private BookingService bookingService;
//     @Autowired
//     private BookingRepository bookingRepository;
//     @Autowired
//     private UserRepository userRepository;

//     // 1. Create a Booking (Reserve or Park)
//     @PostMapping("/create")
//     public ResponseEntity<?> createBooking(@RequestBody BookingRequest request, Principal principal) {
//         try {
//             // principal.getName() is the email/phone from the JWT token
//             Booking booking = bookingService.createBooking(request, principal.getName());
            
//             // Returning the full entity for testing visibility
//             // In production, map this to a BookingResponseDTO
//             return ResponseEntity.ok(booking);
//         } catch (RuntimeException e) {
//             return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
//         }
//     }

//     // 2. Cancel / End Booking (HTTP Fallback for WebSocket)
//     // Note: Usually we use WebSockets for arrival/exit to be real-time, 
//     // but having an HTTP endpoint is good for testing via Postman.
//     @PostMapping("/{bookingId}/end")
//     public ResponseEntity<?> endBooking(@PathVariable Long bookingId, Principal principal) {
//         try {
//             Booking receipt = bookingService.endBookingAndPay(bookingId);
//             return ResponseEntity.ok(receipt);
//         } catch (RuntimeException e) {
//             return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
//         }
//     }
    
//     // 3. Scan Arrival (HTTP Fallback)
//     @PostMapping("/{bookingId}/arrive")
//     public ResponseEntity<?> scanArrival(@PathVariable Long bookingId, Principal principal) {
//         try {
//             Booking updated = bookingService.handleArrival(bookingId);
//             return ResponseEntity.ok(updated);
//         } catch (RuntimeException e) {
//             return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
//         }
//     }

//     @GetMapping("/active")
//     public ResponseEntity<?> getActiveBooking(Principal principal) {
//         // You'll need to inject UserRepository to get ID from principal name
//         User user = userRepository.findByEmailOrPhone(principal.getName(), principal.getName()).orElseThrow();
        
//         return bookingRepository.findActiveBookingByUser(user.getUserId())
//                 .map(ResponseEntity::ok)
//                 .orElse(ResponseEntity.noContent().build()); // 204 No Content if no active booking
//     }
// }


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
}