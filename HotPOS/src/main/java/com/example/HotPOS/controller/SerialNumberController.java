package com.example.HotPOS.controller;

import com.example.HotPOS.dto.SerialNumberDTO;
import com.example.HotPOS.entity.SerialNumber;
import com.example.HotPOS.enums.SerialNumberStatus;
import com.example.HotPOS.repository.SerialNumberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/serial-numbers")
@RequiredArgsConstructor
public class SerialNumberController {

    private final SerialNumberRepository serialNumberRepository;

    @GetMapping("/branch/{branchId}")
    public ResponseEntity<List<SerialNumberDTO>> getByBranch(@PathVariable Long branchId) {
        List<SerialNumberDTO> serials = serialNumberRepository.findByBranchAndStatus(branchId, SerialNumberStatus.IN_STOCK)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(serials);
    }

    @GetMapping("/branch/{branchId}/all")
    public ResponseEntity<List<SerialNumberDTO>> getAllByBranch(
            @PathVariable Long branchId,
            @RequestParam(required = false) String status) {
        List<SerialNumber> serials;
        if (status != null) {
            serials = serialNumberRepository.findByBranchAndStatus(branchId, SerialNumberStatus.valueOf(status));
        } else {
            // Get all statuses by querying each
            serials = serialNumberRepository.findByBranchAndStatus(branchId, SerialNumberStatus.IN_STOCK);
            serials.addAll(serialNumberRepository.findByBranchAndStatus(branchId, SerialNumberStatus.SOLD));
            serials.addAll(serialNumberRepository.findByBranchAndStatus(branchId, SerialNumberStatus.RETURNED));
            serials.addAll(serialNumberRepository.findByBranchAndStatus(branchId, SerialNumberStatus.DEFECTIVE));
            serials.addAll(serialNumberRepository.findByBranchAndStatus(branchId, SerialNumberStatus.TRANSFERRED));
        }
        return ResponseEntity.ok(serials.stream().map(this::toDTO).collect(Collectors.toList()));
    }

    @GetMapping("/available")
    public ResponseEntity<List<SerialNumberDTO>> getAvailable(
            @RequestParam Long productId,
            @RequestParam Long branchId) {
        List<SerialNumberDTO> serials = serialNumberRepository.findAvailableByProductAndBranch(productId, branchId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(serials);
    }

    @GetMapping("/lookup/{serialNumber}")
    public ResponseEntity<SerialNumberDTO> lookup(@PathVariable String serialNumber) {
        return serialNumberRepository.findBySerialNumber(serialNumber)
                .map(this::toDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/purchase/{purchaseId}")
    public ResponseEntity<List<SerialNumberDTO>> getByPurchase(@PathVariable Long purchaseId) {
        List<SerialNumberDTO> serials = serialNumberRepository.findByPurchaseId(purchaseId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(serials);
    }

    @GetMapping("/sale/{saleId}")
    public ResponseEntity<List<SerialNumberDTO>> getBySale(@PathVariable Long saleId) {
        List<SerialNumberDTO> serials = serialNumberRepository.findBySaleId(saleId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(serials);
    }

    @GetMapping("/stock-item/{stockItemId}")
    public ResponseEntity<List<SerialNumberDTO>> getByStockItem(@PathVariable Long stockItemId) {
        List<SerialNumberDTO> serials = serialNumberRepository.findByStockItemId(stockItemId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(serials);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<SerialNumberDTO> updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam(required = false) String notes) {
        SerialNumber sn = serialNumberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Serial number not found"));
        sn.setStatus(SerialNumberStatus.valueOf(status));
        if (notes != null) {
            sn.setNotes(notes);
        }
        return ResponseEntity.ok(toDTO(serialNumberRepository.save(sn)));
    }

    @GetMapping("/stats/{branchId}")
    public ResponseEntity<Map<String, Object>> getStats(@PathVariable Long branchId) {
        Map<String, Object> stats = new HashMap<>();
        stats.put("total", serialNumberRepository.countByBranch(branchId));
        stats.put("inStock", serialNumberRepository.countByBranchAndStatus(branchId, SerialNumberStatus.IN_STOCK));
        stats.put("sold", serialNumberRepository.countByBranchAndStatus(branchId, SerialNumberStatus.SOLD));
        stats.put("transferred", serialNumberRepository.countByBranchAndStatus(branchId, SerialNumberStatus.TRANSFERRED));
        stats.put("returned", serialNumberRepository.countByBranchAndStatus(branchId, SerialNumberStatus.RETURNED));
        stats.put("defective", serialNumberRepository.countByBranchAndStatus(branchId, SerialNumberStatus.DEFECTIVE));
        return ResponseEntity.ok(stats);
    }

    private SerialNumberDTO toDTO(SerialNumber sn) {
        return SerialNumberDTO.builder()
                .id(sn.getId())
                .stockItemId(sn.getStockItem().getId())
                .productId(sn.getStockItem().getProduct().getId())
                .productName(sn.getStockItem().getProduct().getName())
                .productSku(sn.getStockItem().getProduct().getSku())
                .serialNumber(sn.getSerialNumber())
                .status(sn.getStatus())
                .purchaseId(sn.getPurchase() != null ? sn.getPurchase().getId() : null)
                .purchaseNumber(sn.getPurchase() != null ? sn.getPurchase().getPurchaseNumber() : null)
                .saleId(sn.getSale() != null ? sn.getSale().getId() : null)
                .saleNumber(sn.getSale() != null ? sn.getSale().getSaleNumber() : null)
                .branchId(sn.getStockItem().getBranch().getId())
                .branchName(sn.getStockItem().getBranch().getName())
                .notes(sn.getNotes())
                .createdAt(sn.getCreatedAt())
                .updatedAt(sn.getUpdatedAt())
                .build();
    }
}
