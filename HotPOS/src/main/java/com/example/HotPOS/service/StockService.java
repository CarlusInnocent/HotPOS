package com.example.HotPOS.service;

import com.example.HotPOS.dto.StockItemDTO;
import com.example.HotPOS.entity.Branch;
import com.example.HotPOS.entity.Product;
import com.example.HotPOS.entity.StockItem;
import com.example.HotPOS.exception.ResourceNotFoundException;
import com.example.HotPOS.repository.BranchRepository;
import com.example.HotPOS.repository.ProductRepository;
import com.example.HotPOS.repository.StockItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StockService {

    private final StockItemRepository stockItemRepository;
    private final BranchRepository branchRepository;
    private final ProductRepository productRepository;

    public List<StockItemDTO> getStockByBranch(Long branchId) {
        return stockItemRepository.findByBranchId(branchId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<StockItemDTO> getLowStock(Long branchId) {
        return stockItemRepository.findLowStockItems(branchId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public StockItemDTO getStockItem(Long branchId, Long productId) {
        StockItem stockItem = stockItemRepository.findByBranchIdAndProductId(branchId, productId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Stock item not found for branch: " + branchId + " and product: " + productId));
        return toDTO(stockItem);
    }

    public Integer getAvailableQuantity(Long branchId, Long productId) {
        return stockItemRepository.getAvailableQuantity(branchId, productId);
    }

    @Transactional
    public StockItemDTO createOrUpdateStock(Long branchId, Long productId, Integer quantity, 
                                            BigDecimal costPrice, BigDecimal sellingPrice) {
        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found with id: " + branchId));
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));

        StockItem stockItem = stockItemRepository.findByBranchIdAndProductId(branchId, productId)
                .orElse(StockItem.builder()
                        .branch(branch)
                        .product(product)
                        .quantity(0)
                        .build());

        stockItem.setQuantity(stockItem.getQuantity() + quantity);
        stockItem.setCostPrice(costPrice);
        stockItem.setLastStockDate(LocalDateTime.now());

        // Update the branch-specific selling price
        if (sellingPrice != null) {
            stockItem.setSellingPrice(sellingPrice);
        }

        StockItem saved = stockItemRepository.save(stockItem);
        return toDTO(saved);
    }

    @Transactional
    public StockItemDTO updateStock(Long id, StockItemDTO dto) {
        StockItem stockItem = stockItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stock item not found with id: " + id));

        stockItem.setQuantity(dto.getQuantity());
        stockItem.setCostPrice(dto.getCostPrice());
        stockItem.setLastStockDate(LocalDateTime.now());

        StockItem saved = stockItemRepository.save(stockItem);
        return toDTO(saved);
    }

    @Transactional
    public void reduceStock(Long branchId, Long productId, Integer quantity) {
        StockItem stockItem = stockItemRepository.findByBranchIdAndProductId(branchId, productId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Stock item not found for branch: " + branchId + " and product: " + productId));
        
        if (stockItem.getQuantity() < quantity) {
            throw new IllegalStateException("Insufficient stock. Available: " + stockItem.getQuantity());
        }
        
        stockItem.setQuantity(stockItem.getQuantity() - quantity);
        stockItemRepository.save(stockItem);
    }

    private StockItemDTO toDTO(StockItem stockItem) {
        // Always use the product's selling price as the source of truth
        BigDecimal effectiveSellingPrice = stockItem.getProduct().getSellingPrice() != null 
                ? stockItem.getProduct().getSellingPrice() 
                : stockItem.getSellingPrice();
        
        return StockItemDTO.builder()
                .id(stockItem.getId())
                .branchId(stockItem.getBranch().getId())
                .branchName(stockItem.getBranch().getName())
                .productId(stockItem.getProduct().getId())
                .productName(stockItem.getProduct().getName())
                .productSku(stockItem.getProduct().getSku())
                .quantity(stockItem.getQuantity())
                .costPrice(stockItem.getCostPrice())
                .sellingPrice(effectiveSellingPrice)
                .reorderLevel(stockItem.getProduct().getReorderLevel())
                .lastStockDate(stockItem.getLastStockDate())
                .categoryName(stockItem.getProduct().getCategory() != null ? stockItem.getProduct().getCategory().getName() : null)
                .requiresSerial(stockItem.getProduct().getRequiresSerial())
                .build();
    }
}
