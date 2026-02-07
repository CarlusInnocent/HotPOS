package com.example.HotPOS.repository;

import com.example.HotPOS.entity.Return;
import com.example.HotPOS.enums.ApprovalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReturnRepository extends JpaRepository<Return, Long> {
    
    Optional<Return> findByReturnNumber(String returnNumber);
    
    boolean existsByReturnNumber(String returnNumber);
    
    List<Return> findByBranchId(Long branchId);
    
    List<Return> findBySupplierId(Long supplierId);
    
    List<Return> findByPurchaseId(Long purchaseId);
    
    List<Return> findByStatus(ApprovalStatus status);
    
    List<Return> findByBranchIdAndReturnDateBetween(Long branchId, LocalDate startDate, LocalDate endDate);
}
