package com.example.HotPOS.repository;

import com.example.HotPOS.entity.StockItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockItemRepository extends JpaRepository<StockItem, Long> {
    
    Optional<StockItem> findByProductIdAndBranchId(Long productId, Long branchId);
    
    List<StockItem> findByBranchId(Long branchId);
    
    List<StockItem> findByProductId(Long productId);
    
    @Query("SELECT s FROM StockItem s WHERE s.branch.id = :branchId AND s.quantity > 0")
    List<StockItem> findAvailableStockByBranch(@Param("branchId") Long branchId);
    
    @Query("SELECT s FROM StockItem s WHERE s.branch.id = :branchId AND s.quantity <= s.product.reorderLevel")
    List<StockItem> findLowStockByBranch(@Param("branchId") Long branchId);
    
    @Query("SELECT s FROM StockItem s WHERE s.quantity <= s.product.reorderLevel AND s.product.isActive = true")
    List<StockItem> findAllLowStock();
    
    @Query("SELECT COALESCE(SUM(s.quantity), 0) FROM StockItem s WHERE s.product.id = :productId")
    Integer getTotalQuantityByProduct(@Param("productId") Long productId);

    Optional<StockItem> findByBranchIdAndProductId(Long branchId, Long productId);

    @Query("SELECT s FROM StockItem s WHERE s.branch.id = :branchId AND s.quantity <= s.product.reorderLevel")
    List<StockItem> findLowStockItems(@Param("branchId") Long branchId);

    @Query("SELECT COALESCE(s.quantity, 0) FROM StockItem s WHERE s.branch.id = :branchId AND s.product.id = :productId")
    Integer getAvailableQuantity(@Param("branchId") Long branchId, @Param("productId") Long productId);

    @Query("SELECT COUNT(s) FROM StockItem s WHERE s.quantity <= s.product.reorderLevel")
    Long countLowStockItems();

    @Query("SELECT COUNT(s) FROM StockItem s WHERE s.branch.id = :branchId AND s.quantity <= s.product.reorderLevel")
    Long countLowStockItemsByBranch(@Param("branchId") Long branchId);

    Long countByBranchId(Long branchId);
}
