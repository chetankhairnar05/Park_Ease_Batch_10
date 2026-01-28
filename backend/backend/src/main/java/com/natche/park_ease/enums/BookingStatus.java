package com.natche.park_ease.enums;


public enum BookingStatus {
    RESERVED,           // Booked, timer running, user not arrived
    ACTIVE_PARKING,     // QR scanned, currently parking
    PAYMENT_PENDING,    // User stopped timer, calculating bill
    COMPLETED,          // Paid and exited
    CANCELLED_NO_SHOW,  // User never arrived (Grace period expired)
    DEFAULTED           // User ran away without paying (Forced exit)
}
/*
RESERVED,           
    ACTIVE_PARKING,     
    PAYMENT_PENDING,    
    COMPLETED,          
    CANCELLED_NO_SHOW,  
    DEFAULTED 
*/