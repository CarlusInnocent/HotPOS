package com.example.HotPOS.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateReturnDTO {
    @NotNull(message = "Branch ID is required")
    private Long branchId;
    
    @NotNull(message = "Supplier ID is required")
    private Long supplierId;
    
    private Long purchaseId;
    
    private String reason;
    
    @NotNull(message = "Items are required")
    private List<CreateReturnItemDTO> items;
}
