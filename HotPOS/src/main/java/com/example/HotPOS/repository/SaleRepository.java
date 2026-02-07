package com.example.HotPOS.repository;

import com.example.HotPOS.entity.Sale;
import com.example.HotPOS.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long> {
    
    Optional<Sale> findBySaleNumber(String saleNumber);
    
    boolean existsBySaleNumber(String saleNumber);
    
    List<Sale> findByBranchId(Long branchId);
    
    List<Sale> findByCustomerId(Long customerId);
    
    List<Sale> findByUserId(Long userId);
    
    List<Sale> findByPaymentStatus(PaymentStatus status);
    
    List<Sale> findByBranchIdAndSaleDateBetween(Long branchId, LocalDate startDate, LocalDate endDate);
    
    @Query("SELECT s FROM Sale s WHERE s.branch.id = :branchId AND s.saleDate = :date")
    List<Sale> findByBranchAndDate(@Param("branchId") Long branchId, @Param("date") LocalDate date);
    
    @Query("SELECT COALESCE(SUM(s.grandTotal), 0) FROM Sale s WHERE s.branch.id = :branchId AND " +
           "s.saleDate BETWEEN :startDate AND :endDate")
    BigDecimal getTotalSalesByBranchAndPeriod(@Param("branchId") Long branchId, 
                                               @Param("startDate") LocalDate startDate, 
                                               @Param("endDate") LocalDate endDate);
    
    @Query("SELECT COUNT(s) FROM Sale s WHERE s.branch.id = :branchId AND s.saleDate = :date")
    Long countSalesByBranchAndDate(@Param("branchId") Long branchId, @Param("date") LocalDate date);
    
    @Query("SELECT COALESCE(SUM(s.grandTotal), 0) FROM Sale s WHERE s.saleDate BETWEEN :startDate AND :endDate")
    BigDecimal getTotalSalesByPeriod(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    List<Sale> findByBranchIdOrderBySaleDateDesc(Long branchId);

    @Query("SELECT s FROM Sale s WHERE s.branch.id = :branchId AND s.saleDate BETWEEN :startDate AND :endDate ORDER BY s.saleDate DESC")
    List<Sale> findByBranchAndDateRange(@Param("branchId") Long branchId, 
                                         @Param("startDate") LocalDate startDate, 
                                         @Param("endDate") LocalDate endDate);

    @Query("SELECT COALESCE(SUM(s.grandTotal), 0) FROM Sale s WHERE s.saleDate BETWEEN :startDate AND :endDate")
    BigDecimal getTotalSalesAmount(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT COALESCE(SUM(s.grandTotal), 0) FROM Sale s WHERE s.branch.id = :branchId AND s.saleDate BETWEEN :startDate AND :endDate")
    BigDecimal getTotalSalesAmountByBranch(@Param("branchId") Long branchId, 
                                            @Param("startDate") LocalDate startDate, 
                                            @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(s) FROM Sale s WHERE s.saleDate = :date")
    Long countByDate(@Param("date") LocalDate date);

    Long countByBranchId(Long branchId);

    @Query("SELECT COUNT(s) FROM Sale s WHERE s.branch.id = :branchId AND s.saleDate = :date")
    Long countByBranchIdAndDate(@Param("branchId") Long branchId, @Param("date") LocalDate date);

    @Query("SELECT s.branch.name, COALESCE(SUM(s.grandTotal), 0) FROM Sale s WHERE s.saleDate BETWEEN :startDate AND :endDate GROUP BY s.branch.name")
    List<Object[]> getSalesByBranch(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
