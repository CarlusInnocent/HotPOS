package com.example.HotPOS.repository;

import com.example.HotPOS.entity.SerialNumber;
import com.example.HotPOS.enums.SerialNumberStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SerialNumberRepository extends JpaRepository<SerialNumber, Long> {
    
    Optional<SerialNumber> findBySerialNumber(String serialNumber);
    
    boolean existsBySerialNumber(String serialNumber);
    
    List<SerialNumber> findByStockItemId(Long stockItemId);
    
    List<SerialNumber> findByStatus(SerialNumberStatus status);
    
    List<SerialNumber> findByStockItemIdAndStatus(Long stockItemId, SerialNumberStatus status);
    
    List<SerialNumber> findBySaleId(Long saleId);
    
    List<SerialNumber> findByPurchaseId(Long purchaseId);
    
    @Query("SELECT sn FROM SerialNumber sn WHERE sn.stockItem.branch.id = :branchId AND sn.status = :status")
    List<SerialNumber> findByBranchAndStatus(@Param("branchId") Long branchId, @Param("status") SerialNumberStatus status);
    
    @Query("SELECT sn FROM SerialNumber sn WHERE sn.stockItem.product.id = :productId AND " +
           "sn.stockItem.branch.id = :branchId AND sn.status = 'IN_STOCK'")
    List<SerialNumber> findAvailableByProductAndBranch(@Param("productId") Long productId, @Param("branchId") Long branchId);
    
    @Query("SELECT COUNT(sn) FROM SerialNumber sn WHERE sn.stockItem.id = :stockItemId AND sn.status = 'IN_STOCK'")
    Long countInStockByStockItem(@Param("stockItemId") Long stockItemId);

    @Query("SELECT sn FROM SerialNumber sn WHERE sn.sale.id = :saleId AND sn.stockItem.product.id = :productId")
    List<SerialNumber> findBySaleIdAndProductId(@Param("saleId") Long saleId, @Param("productId") Long productId);

    @Query("SELECT COUNT(sn) FROM SerialNumber sn WHERE sn.stockItem.branch.id = :branchId AND sn.status = :status")
    Long countByBranchAndStatus(@Param("branchId") Long branchId, @Param("status") SerialNumberStatus status);

    @Query("SELECT COUNT(sn) FROM SerialNumber sn WHERE sn.stockItem.branch.id = :branchId")
    Long countByBranch(@Param("branchId") Long branchId);

    @Query("SELECT sn FROM SerialNumber sn WHERE sn.stockItem.branch.id = :branchId ORDER BY sn.updatedAt DESC")
    List<SerialNumber> findAllByBranchOrderByUpdatedAtDesc(@Param("branchId") Long branchId);
}
