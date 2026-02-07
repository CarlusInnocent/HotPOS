package com.example.HotPOS.controller;

import com.example.HotPOS.dto.CreateRefundDTO;
import com.example.HotPOS.dto.RefundDTO;
import com.example.HotPOS.security.UserPrincipal;
import com.example.HotPOS.service.RefundService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/refunds")
@RequiredArgsConstructor
public class RefundController {

    private final RefundService refundService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<RefundDTO>> getAllRefunds() {
        return ResponseEntity.ok(refundService.getAllRefunds());
    }

    @GetMapping("/branch/{branchId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CASHIER')")
    public ResponseEntity<List<RefundDTO>> getRefundsByBranch(@PathVariable Long branchId) {
        return ResponseEntity.ok(refundService.getRefundsByBranch(branchId));
    }

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CASHIER')")
    public ResponseEntity<List<RefundDTO>> getRefundsByCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(refundService.getRefundsByCustomer(customerId));
    }

    @GetMapping("/sale/{saleId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CASHIER')")
    public ResponseEntity<List<RefundDTO>> getRefundsBySale(@PathVariable Long saleId) {
        return ResponseEntity.ok(refundService.getRefundsBySale(saleId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CASHIER')")
    public ResponseEntity<RefundDTO> getRefundById(@PathVariable Long id) {
        return ResponseEntity.ok(refundService.getRefundById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CASHIER')")
    public ResponseEntity<RefundDTO> createRefund(
            @Valid @RequestBody CreateRefundDTO dto,
            @AuthenticationPrincipal UserPrincipal userDetails) {
        RefundDTO created = refundService.createRefund(dto, userDetails.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<RefundDTO> approveRefund(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userDetails) {
        return ResponseEntity.ok(refundService.approveRefund(id, userDetails.getId()));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<RefundDTO> rejectRefund(@PathVariable Long id) {
        return ResponseEntity.ok(refundService.rejectRefund(id));
    }
}
