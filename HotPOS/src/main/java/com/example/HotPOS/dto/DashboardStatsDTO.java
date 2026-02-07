package com.example.HotPOS.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardStatsDTO {
    // Legacy fields
    private BigDecimal todaySales;
    private BigDecimal weekSales;
    private BigDecimal monthSales;
    private Long totalSalesCount;
    private Long todaySalesCount;
    private BigDecimal totalExpenses;
    private Long totalProducts;
    private Long lowStockProducts;
    private Long totalCustomers;
    private Map<String, BigDecimal> salesByBranch;
    private Map<String, BigDecimal> salesByCategory;
    
    // New fields matching frontend expectations
    private BigDecimal totalSalesToday;
    private BigDecimal totalSalesThisMonth;
    private BigDecimal totalSalesThisYear;
    private Long transactionCountToday;
    private Long transactionCountThisMonth;
    private BigDecimal averageTransactionValue;
    private List<TopSellingProductDTO> topSellingProducts;
    private List<StockItemDTO> lowStockItems;
    private List<SaleDTO> recentSales;
    private Map<String, BigDecimal> salesByPaymentMethod;
    private BigDecimal totalExpensesThisMonth;
    private BigDecimal netProfitThisMonth;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TopSellingProductDTO {
        private Long productId;
        private String productName;
        private Long totalQuantity;
        private BigDecimal totalRevenue;
    }
}
