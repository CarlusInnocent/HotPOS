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
public class SaleDTO {
    private Long id;
    private Long branchId;
    private String branchName;
    private Long customerId;
    private String customerName;
    private Long userId;
    private String userName;
    private String saleNumber;
    private LocalDate saleDate;
    private BigDecimal totalAmount;
    private BigDecimal taxAmount;
    private BigDecimal discountAmount;
    private BigDecimal grandTotal;
    private PaymentMethod paymentMethod;
    private PaymentStatus paymentStatus;
    private String notes;
    private List<SaleItemDTO> items;
    private LocalDateTime createdAt;
}
