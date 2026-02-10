package com.example.HotPOS.service;

import com.example.HotPOS.dto.*;
import com.example.HotPOS.entity.*;
import com.example.HotPOS.enums.PaymentStatus;
import com.example.HotPOS.enums.SerialNumberStatus;
import com.example.HotPOS.exception.ResourceNotFoundException;
import com.example.HotPOS.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PurchaseService {

    private final PurchaseRepository purchaseRepository;
    private final BranchRepository branchRepository;
    private final SupplierRepository supplierRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final StockItemRepository stockItemRepository;
    private final SerialNumberRepository serialNumberRepository;

    public List<PurchaseDTO> getPurchasesByBranch(Long branchId) {
        return purchaseRepository.findByBranchIdOrderByPurchaseDateDescCreatedAtDesc(branchId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<PurchaseDTO> getPurchasesByDateRange(Long branchId, LocalDate startDate, LocalDate endDate) {
        return purchaseRepository.findByBranchIdAndPurchaseDateBetween(branchId, startDate, endDate).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public PurchaseDTO getPurchaseById(Long id) {
        Purchase purchase = purchaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase not found with id: " + id));
        return toDTO(purchase);
    }

    @Transactional
    public PurchaseDTO createPurchase(CreatePurchaseDTO dto, Long userId) {
        Branch branch = branchRepository.findById(dto.getBranchId())
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found with id: " + dto.getBranchId()));
        
        Supplier supplier = supplierRepository.findById(dto.getSupplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with id: " + dto.getSupplierId()));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        String purchaseNumber = generatePurchaseNumber(branch.getCode());

        Purchase purchase = Purchase.builder()
                .branch(branch)
                .supplier(supplier)
                .user(user)
                .purchaseNumber(purchaseNumber)
                .purchaseDate(LocalDate.now())
                .paymentStatus(PaymentStatus.PAID)
                .taxAmount(dto.getTaxAmount() != null ? dto.getTaxAmount() : BigDecimal.ZERO)
                .notes(dto.getNotes())
                .items(new ArrayList<>())
                .build();

        BigDecimal totalAmount = BigDecimal.ZERO;

        for (CreatePurchaseItemDTO itemDto : dto.getItems()) {
            Product product = productRepository.findById(itemDto.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + itemDto.getProductId()));

            BigDecimal unitCost = itemDto.getUnitCost() != null ? itemDto.getUnitCost() : BigDecimal.ZERO;
            BigDecimal itemTotal = unitCost.multiply(BigDecimal.valueOf(itemDto.getQuantity()));

            PurchaseItem purchaseItem = PurchaseItem.builder()
                .purchase(purchase)
                .product(product)
                .quantity(itemDto.getQuantity())
                .unitCost(unitCost)
                .totalCost(itemTotal)
                .build();

            purchase.getItems().add(purchaseItem);
            totalAmount = totalAmount.add(itemTotal);
            
            // Note: Stock is NOT updated here - it's updated when the purchase is received
        }

        BigDecimal taxAmount = dto.getTaxAmount() != null ? dto.getTaxAmount() : BigDecimal.ZERO;
        BigDecimal grandTotal = totalAmount.add(taxAmount);

        purchase.setTotalAmount(totalAmount);
        purchase.setGrandTotal(grandTotal);

        Purchase saved = purchaseRepository.save(purchase);
        return toDTO(saved);
    }

    @Transactional
    public PurchaseDTO receivePurchase(Long purchaseId, Long userId, ReceivePurchaseDTO receiveDto) {
        Purchase purchase = purchaseRepository.findById(purchaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase not found with id: " + purchaseId));

        if ("RECEIVED".equals(purchase.getStatus())) {
            throw new IllegalStateException("Purchase has already been received");
        }

        // Build a map of selling price updates if provided
        java.util.Map<Long, BigDecimal> sellingPriceUpdates = new java.util.HashMap<>();
        java.util.Map<Long, List<String>> serialNumbersMap = new java.util.HashMap<>();
        if (receiveDto != null && receiveDto.getItems() != null) {
            for (ReceivePurchaseDTO.ReceiveItemDTO item : receiveDto.getItems()) {
                if (item.getProductId() != null) {
                    if (item.getSellingPrice() != null) {
                        sellingPriceUpdates.put(item.getProductId(), item.getSellingPrice());
                    }
                    if (item.getSerialNumbers() != null && !item.getSerialNumbers().isEmpty()) {
                        serialNumbersMap.put(item.getProductId(), item.getSerialNumbers());
                    }
                }
            }
        }

        // Update stock for each item
        for (PurchaseItem item : purchase.getItems()) {
            StockItem stockItem = stockItemRepository.findByBranchIdAndProductId(
                    purchase.getBranch().getId(), item.getProduct().getId())
                    .orElse(StockItem.builder()
                            .branch(purchase.getBranch())
                            .product(item.getProduct())
                            .quantity(0)
                            .build());

            stockItem.setQuantity(stockItem.getQuantity() + item.getQuantity());
            stockItem.setCostPrice(item.getUnitCost());
            stockItem.setLastStockDate(LocalDateTime.now());
            
            // Update branch-specific selling price if provided
            if (sellingPriceUpdates.containsKey(item.getProduct().getId())) {
                stockItem.setSellingPrice(sellingPriceUpdates.get(item.getProduct().getId()));
            }
            
            StockItem savedStockItem = stockItemRepository.save(stockItem);

            // Create serial number records for serialized products
            if (Boolean.TRUE.equals(item.getProduct().getRequiresSerial())) {
                List<String> serials = serialNumbersMap.get(item.getProduct().getId());
                if (serials != null && !serials.isEmpty()) {
                    if (serials.size() != item.getQuantity()) {
                        throw new IllegalStateException(
                            "Serial number count (" + serials.size() + ") does not match quantity (" + 
                            item.getQuantity() + ") for product: " + item.getProduct().getName()
                        );
                    }
                    for (String serial : serials) {
                        // Check for duplicate serial numbers
                        if (serialNumberRepository.existsBySerialNumber(serial)) {
                            throw new IllegalStateException("Serial number already exists: " + serial);
                        }
                        SerialNumber serialNumber = SerialNumber.builder()
                                .stockItem(savedStockItem)
                                .serialNumber(serial)
                                .status(SerialNumberStatus.IN_STOCK)
                                .purchase(purchase)
                                .build();
                        serialNumberRepository.save(serialNumber);
                    }
                }
            }
        }

        purchase.setStatus("RECEIVED");
        Purchase saved = purchaseRepository.save(purchase);
        return toDTO(saved);
    }

    private String generatePurchaseNumber(String branchCode) {
        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        return "PO-" + branchCode + "-" + dateStr;
    }

    private PurchaseDTO toDTO(Purchase purchase) {
        List<PurchaseItemDTO> items = purchase.getItems().stream()
                .map(item -> PurchaseItemDTO.builder()
                    .id(item.getId())
                    .productId(item.getProduct().getId())
                    .productName(item.getProduct().getName())
                    .productSku(item.getProduct().getSku())
                    .quantity(item.getQuantity())
                    .unitCost(item.getUnitCost() != null ? item.getUnitCost() : BigDecimal.ZERO)
                    .sellingPrice(item.getProduct().getSellingPrice())
                    .totalCost(item.getTotalCost())
                    .build())
                .collect(Collectors.toList());

        return PurchaseDTO.builder()
                .id(purchase.getId())
                .branchId(purchase.getBranch().getId())
                .branchName(purchase.getBranch().getName())
                .supplierId(purchase.getSupplier().getId())
                .supplierName(purchase.getSupplier().getName())
                .userId(purchase.getUser().getId())
                .userName(purchase.getUser().getFullName())
                .purchaseNumber(purchase.getPurchaseNumber())
                .purchaseDate(purchase.getPurchaseDate())
                .totalAmount(purchase.getTotalAmount())
                .taxAmount(purchase.getTaxAmount())
                .grandTotal(purchase.getGrandTotal())
                .paymentMethod(null)
                .paymentStatus(purchase.getPaymentStatus())
                .status(purchase.getStatus())
                .notes(purchase.getNotes())
                .items(items)
                .createdAt(purchase.getCreatedAt())
                .build();
    }
}
