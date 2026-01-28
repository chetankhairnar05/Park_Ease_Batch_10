package com.natche.park_ease.dto;

import com.natche.park_ease.enums.PaymentMethod;
import lombok.Data;

@Data
public class WalletTopUpRequest {
    private Double amount;
    private PaymentMethod paymentMethod; // How did they add money? (UPI/CARD)
}