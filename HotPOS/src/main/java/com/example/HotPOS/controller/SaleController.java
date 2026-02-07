package com.example.HotPOS.controller;

import com.example.HotPOS.dto.CreateSaleDTO;
import com.example.HotPOS.dto.SaleDTO;
import com.example.HotPOS.security.UserPrincipal;
import com.example.HotPOS.service.SaleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/sales")
@RequiredArgsConstructor
public class SaleController {

    private final SaleService saleService;

    @GetMapping("/branch/{branchId}")
    public ResponseEntity<List<SaleDTO>> getSalesByBranch(@PathVariable Long branchId) {
        return ResponseEntity.ok(saleService.getSalesByBranch(branchId));
    }

    @GetMapping("/branch/{branchId}/today")
    public ResponseEntity<List<SaleDTO>> getTodaySales(@PathVariable Long branchId) {
        return ResponseEntity.ok(saleService.getTodaySales(branchId));
    }

    @GetMapping("/branch/{branchId}/range")
    public ResponseEntity<List<SaleDTO>> getSalesByDateRange(
            @PathVariable Long branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(saleService.getSalesByDateRange(branchId, startDate, endDate));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SaleDTO> getSaleById(@PathVariable Long id) {
        return ResponseEntity.ok(saleService.getSaleById(id));
    }

    @GetMapping("/number/{saleNumber}")
    public ResponseEntity<SaleDTO> getSaleBySaleNumber(@PathVariable String saleNumber) {
        return ResponseEntity.ok(saleService.getSaleBySaleNumber(saleNumber));
    }

    @PostMapping
    public ResponseEntity<SaleDTO> createSale(
            @Valid @RequestBody CreateSaleDTO dto,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(saleService.createSale(dto, userPrincipal.getId()));
    }
}
