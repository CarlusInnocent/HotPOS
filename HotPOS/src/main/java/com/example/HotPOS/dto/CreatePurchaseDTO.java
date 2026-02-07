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
public class CreatePurchaseDTO {
    @NotNull(message = "Branch is required")
    private Long branchId;
    
    @NotNull(message = "Supplier is required")
    private Long supplierId;
    
    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;
    
    private BigDecimal taxAmount;
    
    private String notes;
    
    @NotEmpty(message = "Purchase must have at least one item")
    private List<CreatePurchaseItemDTO> items;
}
