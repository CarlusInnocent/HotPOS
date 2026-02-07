package com.example.HotPOS.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateTransferDTO {
    @NotNull(message = "Source branch is required")
    private Long fromBranchId;
    
    @NotNull(message = "Destination branch is required")
    private Long toBranchId;
    
    private String notes;
    
    @NotEmpty(message = "Transfer must have at least one item")
    private List<CreateTransferItemDTO> items;
}
