package com.example.HotPOS.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductDTO {
    private Long id;
    private Long categoryId;
    private String categoryName;
    private String sku;
    private String name;
    private String description;
    private String unitOfMeasure;
    private Boolean requiresSerial;
    private Integer reorderLevel;
    private BigDecimal sellingPrice;
    private Boolean isActive;
}
