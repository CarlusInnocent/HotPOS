package com.example.HotPOS.repository;

import com.example.HotPOS.entity.Transfer;
import com.example.HotPOS.enums.TransferStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransferRepository extends JpaRepository<Transfer, Long> {
    
    Optional<Transfer> findByTransferNumber(String transferNumber);
    
    boolean existsByTransferNumber(String transferNumber);
    
    List<Transfer> findByFromBranchId(Long fromBranchId);
    
    List<Transfer> findByFromBranchIdOrderByTransferDateDescCreatedAtDesc(Long fromBranchId);
    
    List<Transfer> findByToBranchId(Long toBranchId);
    
    List<Transfer> findByToBranchIdOrderByTransferDateDescCreatedAtDesc(Long toBranchId);
    
    List<Transfer> findByStatus(TransferStatus status);
    
    @Query("SELECT t FROM Transfer t WHERE (t.fromBranch.id = :branchId OR t.toBranch.id = :branchId)")
    List<Transfer> findByBranchId(@Param("branchId") Long branchId);

    @Query("SELECT t FROM Transfer t WHERE (t.fromBranch.id = :branchId OR t.toBranch.id = :branchId) ORDER BY t.transferDate DESC, t.createdAt DESC")
    List<Transfer> findByBranchIdOrderByDateDesc(@Param("branchId") Long branchId);
    
    @Query("SELECT t FROM Transfer t WHERE t.toBranch.id = :branchId AND t.status = 'IN_TRANSIT'")
    List<Transfer> findPendingReceiptsByBranch(@Param("branchId") Long branchId);
    
    List<Transfer> findByFromBranchIdAndTransferDateBetween(Long fromBranchId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT t FROM Transfer t WHERE t.toBranch.id = :branchId AND t.status = 'PENDING' ORDER BY t.transferDate DESC, t.createdAt DESC")
    List<Transfer> findPendingTransfers(@Param("branchId") Long branchId);
}
