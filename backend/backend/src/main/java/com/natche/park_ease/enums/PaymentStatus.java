package com.natche.park_ease.enums;

/**
 * Processing outcome for a payment attempt.
 */
public enum PaymentStatus {
    PENDING,//user stoped clock but not paid
    SUCCESS,//payment success
    FAILED;//payment failed
}
