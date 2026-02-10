package com.example.HotPOS.repository;

import com.example.HotPOS.entity.Refund;
import com.example.HotPOS.enums.ApprovalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface RefundRepository extends JpaRepository<Refund, Long> {
    
    Optional<Refund> findByRefundNumber(String refundNumber);
    
    boolean existsByRefundNumber(String refundNumber);
    
    List<Refund> findByBranchId(Long branchId);

    List<Refund> findByBranchIdOrderByRefundDateDescCreatedAtDesc(Long branchId);
    
    List<Refund> findByCustomerId(Long customerId);
    
    List<Refund> findBySaleId(Long saleId);
    
    List<Refund> findByStatus(ApprovalStatus status);

    // Get total approved refund amount for a specific sale
    @Query("SELECT COALESCE(SUM(r.totalAmount), 0) FROM Refund r WHERE r.sale.id = :saleId AND r.status = 'APPROVED'")
    BigDecimal getTotalApprovedRefundsAmountBySale(@Param("saleId") Long saleId);

    // Check if a sale has any approved refunds
    @Query("SELECT COUNT(r) > 0 FROM Refund r WHERE r.sale.id = :saleId AND r.status = 'APPROVED'")
    boolean hasApprovedRefundsBySale(@Param("saleId") Long saleId);

    // Get all sale IDs that have approved refunds (for batch lookup)
    @Query("SELECT r.sale.id, COALESCE(SUM(r.totalAmount), 0) FROM Refund r WHERE r.sale.id IN :saleIds AND r.status = 'APPROVED' GROUP BY r.sale.id")
    List<Object[]> getApprovedRefundAmountsBySaleIds(@Param("saleIds") List<Long> saleIds);
    
    List<Refund> findByBranchIdAndRefundDateBetween(Long branchId, LocalDate startDate, LocalDate endDate);
    
    // Get total approved refund amount for all branches in date range
    @Query("SELECT COALESCE(SUM(r.totalAmount), 0) FROM Refund r WHERE r.status = 'APPROVED' AND r.refundDate BETWEEN :startDate AND :endDate")
    BigDecimal getTotalApprovedRefundsAmount(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    // Get total approved refund amount for a specific branch in date range
    @Query("SELECT COALESCE(SUM(r.totalAmount), 0) FROM Refund r WHERE r.branch.id = :branchId AND r.status = 'APPROVED' AND r.refundDate BETWEEN :startDate AND :endDate")
    BigDecimal getTotalApprovedRefundsAmountByBranch(@Param("branchId") Long branchId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
