package com.example.HotPOS.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockItemDTO {
    private Long id;
    private Long branchId;
    private String branchName;
    private Long productId;
    private String productName;
    private String productSku;
    private Integer quantity;
    private BigDecimal costPrice;
    private BigDecimal sellingPrice;
    private Integer reorderLevel;
    private LocalDateTime lastStockDate;
    private String categoryName;
    private Boolean requiresSerial;
}
