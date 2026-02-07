package com.example.HotPOS.controller;

import com.example.HotPOS.dto.StockItemDTO;
import com.example.HotPOS.service.StockService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/stock")
@RequiredArgsConstructor
public class StockController {

    private final StockService stockService;

    @GetMapping("/branch/{branchId}")
    public ResponseEntity<List<StockItemDTO>> getStockByBranch(@PathVariable Long branchId) {
        return ResponseEntity.ok(stockService.getStockByBranch(branchId));
    }

    @GetMapping("/branch/{branchId}/low")
    public ResponseEntity<List<StockItemDTO>> getLowStock(@PathVariable Long branchId) {
        return ResponseEntity.ok(stockService.getLowStock(branchId));
    }

    @GetMapping("/branch/{branchId}/product/{productId}")
    public ResponseEntity<StockItemDTO> getStockItem(@PathVariable Long branchId, @PathVariable Long productId) {
        return ResponseEntity.ok(stockService.getStockItem(branchId, productId));
    }

    @GetMapping("/branch/{branchId}/product/{productId}/quantity")
    public ResponseEntity<Integer> getAvailableQuantity(@PathVariable Long branchId, @PathVariable Long productId) {
        return ResponseEntity.ok(stockService.getAvailableQuantity(branchId, productId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STOCK_KEEPER')")
    public ResponseEntity<StockItemDTO> updateStock(@PathVariable Long id, @RequestBody StockItemDTO dto) {
        return ResponseEntity.ok(stockService.updateStock(id, dto));
    }

    @PostMapping("/adjust")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STOCK_KEEPER')")
    public ResponseEntity<StockItemDTO> adjustStock(
            @RequestParam Long branchId,
            @RequestParam Long productId,
            @RequestParam Integer quantity,
            @RequestParam BigDecimal costPrice,
            @RequestParam BigDecimal sellingPrice) {
        return ResponseEntity.ok(stockService.createOrUpdateStock(branchId, productId, quantity, costPrice, sellingPrice));
    }
}
