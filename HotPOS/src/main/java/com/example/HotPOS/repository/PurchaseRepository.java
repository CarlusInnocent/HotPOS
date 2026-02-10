package com.example.HotPOS.repository;

import com.example.HotPOS.entity.Purchase;
import com.example.HotPOS.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseRepository extends JpaRepository<Purchase, Long> {
    
    Optional<Purchase> findByPurchaseNumber(String purchaseNumber);
    
    boolean existsByPurchaseNumber(String purchaseNumber);
    
    List<Purchase> findByBranchId(Long branchId);

    List<Purchase> findByBranchIdOrderByPurchaseDateDescCreatedAtDesc(Long branchId);
    
    List<Purchase> findBySupplierId(Long supplierId);
    
    List<Purchase> findByPaymentStatus(PaymentStatus status);
    
    List<Purchase> findByBranchIdAndPurchaseDateBetween(Long branchId, LocalDate startDate, LocalDate endDate);
    
    @Query("SELECT p FROM Purchase p WHERE p.branch.id = :branchId AND p.purchaseDate = :date")
    List<Purchase> findByBranchAndDate(@Param("branchId") Long branchId, @Param("date") LocalDate date);
    
    @Query("SELECT COALESCE(SUM(p.grandTotal), 0) FROM Purchase p WHERE p.branch.id = :branchId AND " +
           "p.purchaseDate BETWEEN :startDate AND :endDate")
    java.math.BigDecimal getTotalPurchasesByBranchAndPeriod(@Param("branchId") Long branchId, 
                                                            @Param("startDate") LocalDate startDate, 
                                                            @Param("endDate") LocalDate endDate);
}
