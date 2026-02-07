package com.example.HotPOS.controller;

import com.example.HotPOS.dto.CreateTransferDTO;
import com.example.HotPOS.dto.TransferDTO;
import com.example.HotPOS.security.UserPrincipal;
import com.example.HotPOS.service.TransferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transfers")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STOCK_KEEPER', 'CASHIER')")
public class TransferController {

    private final TransferService transferService;

    @GetMapping("/from/{branchId}")
    public ResponseEntity<List<TransferDTO>> getTransfersByFromBranch(@PathVariable Long branchId) {
        return ResponseEntity.ok(transferService.getTransfersByFromBranch(branchId));
    }

    @GetMapping("/to/{branchId}")
    public ResponseEntity<List<TransferDTO>> getTransfersByToBranch(@PathVariable Long branchId) {
        return ResponseEntity.ok(transferService.getTransfersByToBranch(branchId));
    }

    @GetMapping("/pending/{branchId}")
    public ResponseEntity<List<TransferDTO>> getPendingTransfers(@PathVariable Long branchId) {
        return ResponseEntity.ok(transferService.getPendingTransfers(branchId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransferDTO> getTransferById(@PathVariable Long id) {
        return ResponseEntity.ok(transferService.getTransferById(id));
    }

    @PostMapping
    public ResponseEntity<TransferDTO> createTransfer(
            @Valid @RequestBody CreateTransferDTO dto,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(transferService.createTransfer(dto, userPrincipal.getId()));
    }

    @PostMapping("/{id}/send")
    public ResponseEntity<TransferDTO> sendTransfer(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(transferService.sendTransfer(id, userPrincipal.getId()));
    }

    @PostMapping("/{id}/receive")
    public ResponseEntity<TransferDTO> receiveTransfer(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(transferService.receiveTransfer(id, userPrincipal.getId()));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<TransferDTO> approveTransfer(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(transferService.approveTransfer(id, userPrincipal.getId()));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<TransferDTO> rejectTransfer(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(transferService.rejectTransfer(id, userPrincipal.getId()));
    }
}
