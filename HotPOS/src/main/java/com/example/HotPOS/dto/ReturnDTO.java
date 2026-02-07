package com.example.HotPOS.dto;

import com.example.HotPOS.enums.ApprovalStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReturnDTO {
    private Long id;
    private Long branchId;
    private String branchName;
    private Long supplierId;
    private String supplierName;
    private Long purchaseId;
    private String purchaseNumber;
    private Long userId;
    private String userName;
    private String returnNumber;
    private LocalDate returnDate;
    private BigDecimal totalAmount;
    private ApprovalStatus status;
    private String reason;
    private List<ReturnItemDTO> items;
    private LocalDateTime createdAt;
}
