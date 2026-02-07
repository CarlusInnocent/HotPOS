package com.example.HotPOS.service;

import com.example.HotPOS.dto.DashboardStatsDTO;
import com.example.HotPOS.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final SaleRepository saleRepository;
    private final ExpenseRepository expenseRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final StockItemRepository stockItemRepository;

    /**
     * Get dashboard stats - called by frontend
     * @param branchId optional branch ID, null for company-wide stats
     */
    public DashboardStatsDTO getStats(Long branchId) {
        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate yearStart = today.withDayOfYear(1);

        BigDecimal salesToday;
        BigDecimal salesThisMonth;
        BigDecimal salesThisYear;
        Long transactionsToday;
        Long transactionsThisMonth;
        BigDecimal expensesThisMonth;

        if (branchId != null) {
            // Branch-specific stats
            salesToday = saleRepository.getTotalSalesAmountByBranch(branchId, today, today);
            salesThisMonth = saleRepository.getTotalSalesAmountByBranch(branchId, monthStart, today);
            salesThisYear = saleRepository.getTotalSalesAmountByBranch(branchId, yearStart, today);
            transactionsToday = saleRepository.countByBranchIdAndDate(branchId, today);
            transactionsThisMonth = saleRepository.countByBranchId(branchId);
            expensesThisMonth = expenseRepository.getTotalExpensesAmountByBranch(branchId, monthStart, today);
        } else {
            // Company-wide stats
            salesToday = saleRepository.getTotalSalesAmount(today, today);
            salesThisMonth = saleRepository.getTotalSalesAmount(monthStart, today);
            salesThisYear = saleRepository.getTotalSalesAmount(yearStart, today);
            transactionsToday = saleRepository.countByDate(today);
            transactionsThisMonth = saleRepository.count();
            expensesThisMonth = expenseRepository.getTotalExpensesAmount(monthStart, today);
        }

        // Handle nulls
        salesToday = salesToday != null ? salesToday : BigDecimal.ZERO;
        salesThisMonth = salesThisMonth != null ? salesThisMonth : BigDecimal.ZERO;
        salesThisYear = salesThisYear != null ? salesThisYear : BigDecimal.ZERO;
        transactionsToday = transactionsToday != null ? transactionsToday : 0L;
        transactionsThisMonth = transactionsThisMonth != null ? transactionsThisMonth : 0L;
        expensesThisMonth = expensesThisMonth != null ? expensesThisMonth : BigDecimal.ZERO;

        // Calculate average transaction value
        BigDecimal avgTransaction = BigDecimal.ZERO;
        if (transactionsThisMonth > 0) {
            avgTransaction = salesThisMonth.divide(BigDecimal.valueOf(transactionsThisMonth), 2, RoundingMode.HALF_UP);
        }

        // Calculate net profit
        BigDecimal netProfit = salesThisMonth.subtract(expensesThisMonth);

        return DashboardStatsDTO.builder()
                .totalSalesToday(salesToday)
                .totalSalesThisMonth(salesThisMonth)
                .totalSalesThisYear(salesThisYear)
                .transactionCountToday(transactionsToday)
                .transactionCountThisMonth(transactionsThisMonth)
                .averageTransactionValue(avgTransaction)
                .totalExpensesThisMonth(expensesThisMonth)
                .netProfitThisMonth(netProfit)
                .topSellingProducts(new ArrayList<>())
                .lowStockItems(new ArrayList<>())
                .recentSales(new ArrayList<>())
                .salesByPaymentMethod(new HashMap<>())
                .build();
    }

    public DashboardStatsDTO getCompanyStats() {
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.minusDays(7);
        LocalDate monthStart = today.withDayOfMonth(1);

        BigDecimal todaySales = saleRepository.getTotalSalesAmount(today, today);
        BigDecimal weekSales = saleRepository.getTotalSalesAmount(weekStart, today);
        BigDecimal monthSales = saleRepository.getTotalSalesAmount(monthStart, today);
        
        Long totalSalesCount = saleRepository.count();
        Long todaySalesCount = saleRepository.countByDate(today);
        
        BigDecimal totalExpenses = expenseRepository.getTotalExpensesAmount(monthStart, today);
        
        Long totalProducts = productRepository.count();
        Long totalCustomers = customerRepository.count();
        
        // Get low stock items count
        Long lowStockProducts = stockItemRepository.countLowStockItems();

        // Get sales by branch
        Map<String, BigDecimal> salesByBranch = new HashMap<>();
        List<Object[]> branchSales = saleRepository.getSalesByBranch(monthStart, today);
        for (Object[] row : branchSales) {
            salesByBranch.put((String) row[0], (BigDecimal) row[1]);
        }

        return DashboardStatsDTO.builder()
                .todaySales(todaySales != null ? todaySales : BigDecimal.ZERO)
                .weekSales(weekSales != null ? weekSales : BigDecimal.ZERO)
                .monthSales(monthSales != null ? monthSales : BigDecimal.ZERO)
                .totalSalesCount(totalSalesCount)
                .todaySalesCount(todaySalesCount)
                .totalExpenses(totalExpenses != null ? totalExpenses : BigDecimal.ZERO)
                .totalProducts(totalProducts)
                .lowStockProducts(lowStockProducts)
                .totalCustomers(totalCustomers)
                .salesByBranch(salesByBranch)
                .build();
    }

    public DashboardStatsDTO getBranchStats(Long branchId) {
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.minusDays(7);
        LocalDate monthStart = today.withDayOfMonth(1);

        BigDecimal todaySales = saleRepository.getTotalSalesAmountByBranch(branchId, today, today);
        BigDecimal weekSales = saleRepository.getTotalSalesAmountByBranch(branchId, weekStart, today);
        BigDecimal monthSales = saleRepository.getTotalSalesAmountByBranch(branchId, monthStart, today);
        
        Long totalSalesCount = saleRepository.countByBranchId(branchId);
        Long todaySalesCount = saleRepository.countByBranchIdAndDate(branchId, today);
        
        BigDecimal totalExpenses = expenseRepository.getTotalExpensesAmountByBranch(branchId, monthStart, today);
        
        Long totalProducts = stockItemRepository.countByBranchId(branchId);
        Long lowStockProducts = stockItemRepository.countLowStockItemsByBranch(branchId);

        return DashboardStatsDTO.builder()
                .todaySales(todaySales != null ? todaySales : BigDecimal.ZERO)
                .weekSales(weekSales != null ? weekSales : BigDecimal.ZERO)
                .monthSales(monthSales != null ? monthSales : BigDecimal.ZERO)
                .totalSalesCount(totalSalesCount)
                .todaySalesCount(todaySalesCount)
                .totalExpenses(totalExpenses != null ? totalExpenses : BigDecimal.ZERO)
                .totalProducts(totalProducts)
                .lowStockProducts(lowStockProducts)
                .build();
    }
}
