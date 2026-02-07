package com.example.HotPOS.repository;

import com.example.HotPOS.entity.Refund;
import com.example.HotPOS.enums.ApprovalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface RefundRepository extends JpaRepository<Refund, Long> {
    
    Optional<Refund> findByRefundNumber(String refundNumber);
    
    boolean existsByRefundNumber(String refundNumber);
    
    List<Refund> findByBranchId(Long branchId);
    
    List<Refund> findByCustomerId(Long customerId);
    
    List<Refund> findBySaleId(Long saleId);
    
    List<Refund> findByStatus(ApprovalStatus status);
    
    List<Refund> findByBranchIdAndRefundDateBetween(Long branchId, LocalDate startDate, LocalDate endDate);
}
