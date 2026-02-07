package com.example.HotPOS.controller;

import com.example.HotPOS.dto.CreateReturnDTO;
import com.example.HotPOS.dto.ReturnDTO;
import com.example.HotPOS.security.UserPrincipal;
import com.example.HotPOS.service.ReturnService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/returns")
@RequiredArgsConstructor
public class ReturnController {

    private final ReturnService returnService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<ReturnDTO>> getAllReturns() {
        return ResponseEntity.ok(returnService.getAllReturns());
    }

    @GetMapping("/branch/{branchId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STOCK_KEEPER', 'CASHIER')")
    public ResponseEntity<List<ReturnDTO>> getReturnsByBranch(@PathVariable Long branchId) {
        return ResponseEntity.ok(returnService.getReturnsByBranch(branchId));
    }

    @GetMapping("/supplier/{supplierId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STOCK_KEEPER')")
    public ResponseEntity<List<ReturnDTO>> getReturnsBySupplier(@PathVariable Long supplierId) {
        return ResponseEntity.ok(returnService.getReturnsBySupplier(supplierId));
    }

    @GetMapping("/purchase/{purchaseId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STOCK_KEEPER')")
    public ResponseEntity<List<ReturnDTO>> getReturnsByPurchase(@PathVariable Long purchaseId) {
        return ResponseEntity.ok(returnService.getReturnsByPurchase(purchaseId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STOCK_KEEPER')")
    public ResponseEntity<ReturnDTO> getReturnById(@PathVariable Long id) {
        return ResponseEntity.ok(returnService.getReturnById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STOCK_KEEPER', 'CASHIER')")
    public ResponseEntity<ReturnDTO> createReturn(
            @Valid @RequestBody CreateReturnDTO dto,
            @AuthenticationPrincipal UserPrincipal userDetails) {
        ReturnDTO created = returnService.createReturn(dto, userDetails.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ReturnDTO> approveReturn(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userDetails) {
        return ResponseEntity.ok(returnService.approveReturn(id, userDetails.getId()));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ReturnDTO> rejectReturn(@PathVariable Long id) {
        return ResponseEntity.ok(returnService.rejectReturn(id));
    }
}
