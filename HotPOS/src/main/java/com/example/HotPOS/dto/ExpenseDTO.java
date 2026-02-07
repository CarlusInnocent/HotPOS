package com.example.HotPOS.dto;

import com.example.HotPOS.enums.PaymentMethod;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseDTO {
    private Long id;
    private Long branchId;
    private String branchName;
    private Long userId;
    private String userName;
    private String expenseNumber;
    private LocalDate expenseDate;
    private String category;
    private String description;
    private BigDecimal amount;
    private PaymentMethod paymentMethod;
    private String receiptNumber;
    private String notes;
    private LocalDateTime createdAt;
}
