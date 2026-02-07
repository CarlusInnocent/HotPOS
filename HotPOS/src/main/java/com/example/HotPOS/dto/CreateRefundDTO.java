package com.example.HotPOS.dto;

import com.example.HotPOS.enums.PaymentMethod;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateRefundDTO {
    @NotNull(message = "Branch ID is required")
    private Long branchId;
    
    private Long customerId;
    
    private Long saleId;
    
    private String reason;
    
    private PaymentMethod refundMethod;
    
    @NotNull(message = "Items are required")
    private List<CreateRefundItemDTO> items;
}
