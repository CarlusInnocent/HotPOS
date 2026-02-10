package com.example.HotPOS.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePurchaseItemDTO {
    @NotNull(message = "Product is required")
    private Long productId;
    
    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    // Optional at creation; if not provided it will default to zero
    private BigDecimal unitCost;
    
    private BigDecimal sellingPrice; // Optional at creation, used during receive
    
    private List<String> serialNumbers; // Required for products with requiresSerial=true
}
