package com.example.HotPOS.dto;

import com.example.HotPOS.enums.ApprovalStatus;
import com.example.HotPOS.enums.PaymentMethod;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundDTO {
    private Long id;
    private Long branchId;
    private String branchName;
    private Long customerId;
    private String customerName;
    private Long saleId;
    private String saleNumber;
    private Long userId;
    private String userName;
    private String refundNumber;
    private LocalDate refundDate;
    private BigDecimal totalAmount;
    private PaymentMethod refundMethod;
    private ApprovalStatus status;
    private String reason;
    private List<RefundItemDTO> items;
    private LocalDateTime createdAt;
}
