package com.example.HotPOS.dto;

import com.example.HotPOS.enums.PaymentMethod;
import com.example.HotPOS.enums.PaymentStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseDTO {
    private Long id;
    private Long branchId;
    private String branchName;
    private Long supplierId;
    private String supplierName;
    private Long userId;
    private String userName;
    private String purchaseNumber;
    private LocalDate purchaseDate;
    private BigDecimal totalAmount;
    private BigDecimal taxAmount;
    private BigDecimal grandTotal;
    private PaymentMethod paymentMethod;
    private PaymentStatus paymentStatus;
    private String status; // Fulfillment status: PENDING, RECEIVED
    private String notes;
    private List<PurchaseItemDTO> items;
    private LocalDateTime createdAt;
}
