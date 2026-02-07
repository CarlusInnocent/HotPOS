package com.example.HotPOS.controller;

import com.example.HotPOS.dto.CreatePurchaseDTO;
import com.example.HotPOS.dto.PurchaseDTO;
import com.example.HotPOS.dto.ReceivePurchaseDTO;
import com.example.HotPOS.security.UserPrincipal;
import com.example.HotPOS.service.PurchaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/purchases")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STOCK_KEEPER', 'CASHIER')")
public class PurchaseController {

    private final PurchaseService purchaseService;

    @GetMapping("/branch/{branchId}")
    public ResponseEntity<List<PurchaseDTO>> getPurchasesByBranch(@PathVariable Long branchId) {
        return ResponseEntity.ok(purchaseService.getPurchasesByBranch(branchId));
    }

    @GetMapping("/branch/{branchId}/range")
    public ResponseEntity<List<PurchaseDTO>> getPurchasesByDateRange(
            @PathVariable Long branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(purchaseService.getPurchasesByDateRange(branchId, startDate, endDate));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseDTO> getPurchaseById(@PathVariable Long id) {
        return ResponseEntity.ok(purchaseService.getPurchaseById(id));
    }

    @PostMapping
    public ResponseEntity<PurchaseDTO> createPurchase(
            @Valid @RequestBody CreatePurchaseDTO dto,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(purchaseService.createPurchase(dto, userPrincipal.getId()));
    }

    @PostMapping("/{id}/receive")
    public ResponseEntity<PurchaseDTO> receivePurchase(
            @PathVariable Long id,
            @RequestBody(required = false) ReceivePurchaseDTO receiveDto,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(purchaseService.receivePurchase(id, userPrincipal.getId(), receiveDto));
    }
}
