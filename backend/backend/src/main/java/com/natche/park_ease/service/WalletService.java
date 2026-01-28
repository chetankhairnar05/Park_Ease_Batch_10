package com.natche.park_ease.service;

import com.natche.park_ease.dto.WalletTopUpRequest;
import com.natche.park_ease.entity.Payment;
import com.natche.park_ease.entity.User;
import com.natche.park_ease.enums.PaymentMethod;
import com.natche.park_ease.enums.PaymentStatus;
import com.natche.park_ease.repository.PaymentRepository;
import com.natche.park_ease.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class WalletService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Transactional
    public Double topUpWallet(WalletTopUpRequest request, String emailOrPhone) {
        System.out.println("Processing wallet top-up for user: " + emailOrPhone + ", Amount: " + request.getAmount());
        if(request.getPaymentMethod()==PaymentMethod.WALLET){
            throw new RuntimeException("Payment Method is not valid");
        }
        // 1. Validate Amount
        if (request.getAmount() <= 0) {
            throw new RuntimeException("Amount must be greater than 0");
        }

        System.out.println("Amount validation passed for user: " + emailOrPhone);

        // 2. Fetch User
        User user = userRepository.findByEmailOrPhone(emailOrPhone, emailOrPhone)
                .orElseThrow(() -> new RuntimeException("User not found"));

        

        // 3. Create Payment Record (Audit Trail)
        Payment payment = Payment.builder()
                .user(user)
                .booking(null) // It's a top-up, no booking linked
                .amount(request.getAmount())
                .method(request.getPaymentMethod())
                .status(PaymentStatus.SUCCESS) // Simulated Success
                .isBookingPayment(false) // Flag as Top-up
                .build();

        paymentRepository.save(payment);

        // 4. Update Wallet Balance
        // Handle null safety if wallet is new
        Double currentBalance = (user.getWalletBalance() == null) ? 0.0 : user.getWalletBalance();
        Double newBalance = currentBalance + request.getAmount();
        
        user.setWalletBalance(newBalance);
        userRepository.save(user);

        return newBalance;
    }
}