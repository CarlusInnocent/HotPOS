package com.example.HotPOS.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceivePurchaseDTO {
    private List<ReceiveItemDTO> items;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReceiveItemDTO {
        private Long productId;
        private BigDecimal sellingPrice; // Optional - if provided, updates the product's selling price
        private List<String> serialNumbers; // Required for products with requiresSerial=true
    }
}
