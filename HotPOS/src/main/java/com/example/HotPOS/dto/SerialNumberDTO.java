package com.example.HotPOS.dto;

import com.example.HotPOS.enums.SerialNumberStatus;
import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SerialNumberDTO {
    private Long id;
    private Long stockItemId;
    private Long productId;
    private String productName;
    private String productSku;
    private String serialNumber;
    private SerialNumberStatus status;
    private Long purchaseId;
    private String purchaseNumber;
    private Long saleId;
    private String saleNumber;
    private Long branchId;
    private String branchName;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
