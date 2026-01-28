package com.natche.park_ease.controller;
//this is demo purpose wallet top-up controller, in real world integrate with payment gateway like Razorpay/Stripe/Paytm etc. , but this controller just simulates wallet top-up , user can pay via UPI, card and by wallet he pays for booking

import com.natche.park_ease.dto.WalletTopUpRequest;
import com.natche.park_ease.service.WalletService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/wallet")
public class WalletController {

    @Autowired
    private WalletService walletService;

    // POST /api/wallet/topup
    @PostMapping("/topup")
    public ResponseEntity<?> topUpWallet(@RequestBody WalletTopUpRequest request, Principal principal) {
        try {
            // principal.getName() is the email/phone from JWT

            System.out.println("Initiating wallet top-up for user: " + principal.getName() + ", Amount: " + request.getAmount());
            Double newBalance = walletService.topUpWallet(request, principal.getName());
            System.out.println("Wallet top-up successful for user: " + principal.getName() + ", Amount: " + request.getAmount());
            
            // Return new balance
            return ResponseEntity.ok(Map.of(
                "message", "Wallet topped up successfully",
                "newBalance", newBalance
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
