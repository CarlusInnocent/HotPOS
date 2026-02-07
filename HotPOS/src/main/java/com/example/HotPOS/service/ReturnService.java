package com.example.HotPOS.service;

import com.example.HotPOS.dto.*;
import com.example.HotPOS.entity.*;
import com.example.HotPOS.enums.ApprovalStatus;
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
public class ReturnService {

    private final ReturnRepository returnRepository;
    private final PurchaseRepository purchaseRepository;
    private final BranchRepository branchRepository;
    private final SupplierRepository supplierRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final StockItemRepository stockItemRepository;
    private final SerialNumberRepository serialNumberRepository;

    public List<ReturnDTO> getAllReturns() {
        return returnRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<ReturnDTO> getReturnsByBranch(Long branchId) {
        return returnRepository.findByBranchId(branchId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<ReturnDTO> getReturnsBySupplier(Long supplierId) {
        return returnRepository.findBySupplierId(supplierId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<ReturnDTO> getReturnsByPurchase(Long purchaseId) {
        return returnRepository.findByPurchaseId(purchaseId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public ReturnDTO getReturnById(Long id) {
        Return returnEntity = returnRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Return not found with id: " + id));
        return toDTO(returnEntity);
    }

    @Transactional
    public ReturnDTO createReturn(CreateReturnDTO dto, Long userId) {
        Branch branch = branchRepository.findById(dto.getBranchId())
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found with id: " + dto.getBranchId()));

        Supplier supplier = supplierRepository.findById(dto.getSupplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with id: " + dto.getSupplierId()));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        Purchase purchase = null;
        if (dto.getPurchaseId() != null) {
            purchase = purchaseRepository.findById(dto.getPurchaseId())
                    .orElseThrow(() -> new ResourceNotFoundException("Purchase not found with id: " + dto.getPurchaseId()));
        }

        String returnNumber = generateReturnNumber(branch.getCode());

        Return returnEntity = Return.builder()
                .branch(branch)
                .supplier(supplier)
                .purchase(purchase)
                .user(user)
                .returnNumber(returnNumber)
                .returnDate(LocalDate.now())
                .reason(dto.getReason())
                .status(ApprovalStatus.PENDING)
                .items(new ArrayList<>())
                .build();

        BigDecimal totalAmount = BigDecimal.ZERO;

        for (CreateReturnItemDTO itemDto : dto.getItems()) {
            Product product = productRepository.findById(itemDto.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + itemDto.getProductId()));

            // Check stock availability
            StockItem stockItem = stockItemRepository.findByBranchIdAndProductId(branch.getId(), product.getId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Product " + product.getName() + " not found in branch stock"));

            if (stockItem.getQuantity() < itemDto.getQuantity()) {
                throw new IllegalStateException(
                        "Insufficient stock to return for " + product.getName() +
                        ". Available: " + stockItem.getQuantity() + ", Requested: " + itemDto.getQuantity());
            }

            BigDecimal itemTotal = itemDto.getUnitCost().multiply(BigDecimal.valueOf(itemDto.getQuantity()));
            totalAmount = totalAmount.add(itemTotal);

            ReturnItem returnItem = ReturnItem.builder()
                    .returnEntity(returnEntity)
                    .product(product)
                    .quantity(itemDto.getQuantity())
                    .unitCost(itemDto.getUnitCost())
                    .totalCost(itemTotal)
                    .build();

            returnEntity.getItems().add(returnItem);
        }

        returnEntity.setTotalAmount(totalAmount);

        Return saved = returnRepository.save(returnEntity);
        return toDTO(saved);
    }

    @Transactional
    public ReturnDTO approveReturn(Long returnId, Long approvedById) {
        Return returnEntity = returnRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Return not found with id: " + returnId));

        if (returnEntity.getStatus() != ApprovalStatus.PENDING) {
            throw new IllegalStateException("Return is not in pending status");
        }

        // Reduce stock for each returned item (going back to supplier)
        for (ReturnItem item : returnEntity.getItems()) {
            StockItem stockItem = stockItemRepository.findByBranchIdAndProductId(
                    returnEntity.getBranch().getId(), item.getProduct().getId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Stock item not found for product: " + item.getProduct().getName()));

            // Reduce stock (items going to supplier)
            if (stockItem.getQuantity() < item.getQuantity()) {
                throw new IllegalStateException(
                        "Insufficient stock to return for " + item.getProduct().getName());
            }

            stockItem.setQuantity(stockItem.getQuantity() - item.getQuantity());
            stockItem.setLastStockDate(LocalDateTime.now());
            stockItemRepository.save(stockItem);

            // Update serial numbers if applicable
            if (item.getProduct().getRequiresSerial()) {
                // Find serial numbers that belong to this purchase and mark them as returned
                List<SerialNumber> serials = serialNumberRepository.findByStockItemId(stockItem.getId());
                int count = 0;
                for (SerialNumber serial : serials) {
                    if (count >= item.getQuantity()) break;
                    if (serial.getStatus() == SerialNumberStatus.IN_STOCK) {
                        serial.setStatus(SerialNumberStatus.RETURNED);
                        serialNumberRepository.save(serial);
                        count++;
                    }
                }
            }
        }

        returnEntity.setStatus(ApprovalStatus.APPROVED);

        Return saved = returnRepository.save(returnEntity);
        return toDTO(saved);
    }

    @Transactional
    public ReturnDTO rejectReturn(Long returnId) {
        Return returnEntity = returnRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Return not found with id: " + returnId));

        if (returnEntity.getStatus() != ApprovalStatus.PENDING) {
            throw new IllegalStateException("Return is not in pending status");
        }

        returnEntity.setStatus(ApprovalStatus.REJECTED);

        Return saved = returnRepository.save(returnEntity);
        return toDTO(saved);
    }

    private String generateReturnNumber(String branchCode) {
        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        return "RET-" + branchCode + "-" + dateStr;
    }

    private ReturnDTO toDTO(Return returnEntity) {
        List<ReturnItemDTO> items = returnEntity.getItems().stream()
                .map(item -> ReturnItemDTO.builder()
                        .id(item.getId())
                        .productId(item.getProduct().getId())
                        .productName(item.getProduct().getName())
                        .productSku(item.getProduct().getSku())
                        .quantity(item.getQuantity())
                        .unitCost(item.getUnitCost())
                        .totalCost(item.getTotalCost())
                        .build())
                .collect(Collectors.toList());

        return ReturnDTO.builder()
                .id(returnEntity.getId())
                .branchId(returnEntity.getBranch().getId())
                .branchName(returnEntity.getBranch().getName())
                .supplierId(returnEntity.getSupplier().getId())
                .supplierName(returnEntity.getSupplier().getName())
                .purchaseId(returnEntity.getPurchase() != null ? returnEntity.getPurchase().getId() : null)
                .purchaseNumber(returnEntity.getPurchase() != null ? returnEntity.getPurchase().getPurchaseNumber() : null)
                .userId(returnEntity.getUser().getId())
                .userName(returnEntity.getUser().getFullName())
                .returnNumber(returnEntity.getReturnNumber())
                .returnDate(returnEntity.getReturnDate())
                .totalAmount(returnEntity.getTotalAmount())
                .status(returnEntity.getStatus())
                .reason(returnEntity.getReason())
                .items(items)
                .createdAt(returnEntity.getCreatedAt())
                .build();
    }
}
