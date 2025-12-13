package com.natche.park_ease.controller;
//this runs the booking scheduler manually for testing purposes, not for production use, it checks expired reservation and frees up slots

import com.natche.park_ease.scheduler.BookingScheduler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/debug")
public class DebugController {

    @Autowired
    private BookingScheduler bookingScheduler;

    @PostMapping("/run-scheduler")
    public ResponseEntity<?> runSchedulerManually() {
        bookingScheduler.checkExpiredReservations();
        return ResponseEntity.ok("Scheduler triggered manually.");
    }
}