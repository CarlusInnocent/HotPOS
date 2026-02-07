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
    
    @NotNull(message = "Unit cost is required")
    private BigDecimal unitCost;
    
    @NotNull(message = "Selling price is required")
    private BigDecimal sellingPrice;
    
    private List<String> serialNumbers; // Required for products with requiresSerial=true
}
