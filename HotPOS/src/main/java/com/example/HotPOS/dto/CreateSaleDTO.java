package com.example.HotPOS.dto;

import com.example.HotPOS.enums.PaymentMethod;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateSaleDTO {
    @NotNull(message = "Branch is required")
    private Long branchId;
    
    private Long customerId; // NULL for walk-in customers

    private String customerName; // Quick name for walk-in customers (used when customerId is null)

    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;
    
    private BigDecimal discountAmount;
    
    private String notes;
    
    @NotEmpty(message = "Sale must have at least one item")
    private List<CreateSaleItemDTO> items;
}
