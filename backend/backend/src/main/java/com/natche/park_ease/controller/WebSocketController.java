package com.natche.park_ease.controller;

//not used
import com.natche.park_ease.entity.Booking;
import com.natche.park_ease.service.BookingService;
import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

// @Controller
// public class WebSocketController {

//     @Autowired
//     private BookingService bookingService;

//     @Autowired
//     private SimpMessagingTemplate messagingTemplate;

//     // Client sends to: /app/booking/arrive
//     @MessageMapping("/booking/arrive")
//     public void handleArrival(@Payload Map<String, Long> payload, Principal principal) {
//         Long bookingId = payload.get("bookingId");
//         try {
//             Booking updatedBooking = bookingService.handleArrival(bookingId);
            
//             // Reply specific user
//             messagingTemplate.convertAndSendToUser(principal.getName(), "/queue/booking-updates", updatedBooking);
//         } catch (Exception e) {
//             messagingTemplate.convertAndSendToUser(principal.getName(), "/queue/errors", e.getMessage());
//         }
//     }

//     // Client sends to: /app/booking/end
//     @MessageMapping("/booking/end")
//     public void handleExit(@Payload Map<String, Long> payload, Principal principal) {
//         Long bookingId = payload.get("bookingId");
//         try {
//             Booking receipt = bookingService.endBookingAndPay(bookingId);
//             messagingTemplate.convertAndSendToUser(principal.getName(), "/queue/booking-updates", receipt);
//         } catch (Exception e) {
//             messagingTemplate.convertAndSendToUser(principal.getName(), "/queue/errors", "Payment Failed: " + e.getMessage());
//         }
//     }
// }


@Controller
public class WebSocketController {

    @Autowired
    private BookingService bookingService;

    // Client sends to: /app/booking/arrive
    @MessageMapping("/booking/arrive")
    public void handleArrival(@Payload Map<String, Long> payload, Principal principal) {
        Long bookingId = payload.get("bookingId");
        // Service now handles the reply internally via sendBookingUpdate()
        bookingService.handleArrival(bookingId);
    }

    // Client sends to: /app/booking/end
    @MessageMapping("/booking/end")
    public void handleExit(@Payload Map<String, Long> payload, Principal principal) {
        Long bookingId = payload.get("bookingId");
        // Service now handles the reply internally
        bookingService.endBookingAndPay(bookingId);
    }
}