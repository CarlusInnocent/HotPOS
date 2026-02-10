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
public class RefundService {

    private final RefundRepository refundRepository;
    private final SaleRepository saleRepository;
    private final BranchRepository branchRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final StockItemRepository stockItemRepository;
    private final SerialNumberRepository serialNumberRepository;

    public List<RefundDTO> getAllRefunds() {
        return refundRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<RefundDTO> getRefundsByBranch(Long branchId) {
        return refundRepository.findByBranchIdOrderByRefundDateDescCreatedAtDesc(branchId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<RefundDTO> getRefundsByCustomer(Long customerId) {
        return refundRepository.findByCustomerId(customerId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<RefundDTO> getRefundsBySale(Long saleId) {
        return refundRepository.findBySaleId(saleId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public RefundDTO getRefundById(Long id) {
        Refund refund = refundRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Refund not found with id: " + id));
        return toDTO(refund);
    }

    @Transactional
    public RefundDTO createRefund(CreateRefundDTO dto, Long userId) {
        Branch branch = branchRepository.findById(dto.getBranchId())
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found with id: " + dto.getBranchId()));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        Sale sale = null;
        if (dto.getSaleId() != null) {
            sale = saleRepository.findById(dto.getSaleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Sale not found with id: " + dto.getSaleId()));
        }

        Customer customer = null;
        if (dto.getCustomerId() != null) {
            customer = customerRepository.findById(dto.getCustomerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + dto.getCustomerId()));
        }

        String refundNumber = generateRefundNumber(branch.getCode());

        Refund refund = Refund.builder()
                .branch(branch)
                .customer(customer)
                .sale(sale)
                .user(user)
                .refundNumber(refundNumber)
                .refundDate(LocalDate.now())
                .reason(dto.getReason())
                .refundMethod(dto.getRefundMethod())
                .status(ApprovalStatus.PENDING)
                .items(new ArrayList<>())
                .build();

        BigDecimal totalAmount = BigDecimal.ZERO;

        for (CreateRefundItemDTO itemDto : dto.getItems()) {
            Product product = productRepository.findById(itemDto.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + itemDto.getProductId()));

            BigDecimal itemTotal = itemDto.getUnitPrice().multiply(BigDecimal.valueOf(itemDto.getQuantity()));
            totalAmount = totalAmount.add(itemTotal);

            RefundItem refundItem = RefundItem.builder()
                    .refund(refund)
                    .product(product)
                    .quantity(itemDto.getQuantity())
                    .unitPrice(itemDto.getUnitPrice())
                    .totalPrice(itemTotal)
                    .build();

            refund.getItems().add(refundItem);
        }

        refund.setTotalAmount(totalAmount);

        Refund saved = refundRepository.save(refund);
        return toDTO(saved);
    }

    @Transactional
    public RefundDTO approveRefund(Long refundId, Long approvedById) {
        Refund refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new ResourceNotFoundException("Refund not found with id: " + refundId));

        if (refund.getStatus() != ApprovalStatus.PENDING) {
            throw new IllegalStateException("Refund is not in pending status");
        }

        // Restore stock for each refunded item
        for (RefundItem item : refund.getItems()) {
            StockItem stockItem = stockItemRepository.findByBranchIdAndProductId(
                    refund.getBranch().getId(), item.getProduct().getId())
                    .orElse(StockItem.builder()
                            .branch(refund.getBranch())
                            .product(item.getProduct())
                            .quantity(0)
                            .costPrice(item.getUnitPrice())
                            .build());

            // Add stock back (customer returned items)
            stockItem.setQuantity(stockItem.getQuantity() + item.getQuantity());
            stockItem.setLastStockDate(LocalDateTime.now());
            stockItemRepository.save(stockItem);

            // Update serial numbers if applicable
            if (item.getProduct().getRequiresSerial()) {
                // If we have serial numbers linked to the original sale, mark them as returned
                if (refund.getSale() != null) {
                    List<SerialNumber> soldSerials = serialNumberRepository.findBySaleId(refund.getSale().getId());
                    int count = 0;
                    for (SerialNumber serial : soldSerials) {
                        if (count >= item.getQuantity()) break;
                        if (serial.getStockItem().getProduct().getId().equals(item.getProduct().getId()) &&
                            serial.getStatus() == SerialNumberStatus.SOLD) {
                            serial.setStatus(SerialNumberStatus.RETURNED);
                            serial.setSale(null);
                            serialNumberRepository.save(serial);
                            count++;
                        }
                    }
                }
            }
        }

        refund.setStatus(ApprovalStatus.APPROVED);

        Refund saved = refundRepository.save(refund);
        return toDTO(saved);
    }

    @Transactional
    public RefundDTO rejectRefund(Long refundId) {
        Refund refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new ResourceNotFoundException("Refund not found with id: " + refundId));

        if (refund.getStatus() != ApprovalStatus.PENDING) {
            throw new IllegalStateException("Refund is not in pending status");
        }

        refund.setStatus(ApprovalStatus.REJECTED);

        Refund saved = refundRepository.save(refund);
        return toDTO(saved);
    }

    private String generateRefundNumber(String branchCode) {
        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        return "REF-" + branchCode + "-" + dateStr;
    }

    private RefundDTO toDTO(Refund refund) {
        List<RefundItemDTO> items = refund.getItems().stream()
                .map(item -> RefundItemDTO.builder()
                        .id(item.getId())
                        .productId(item.getProduct().getId())
                        .productName(item.getProduct().getName())
                        .productSku(item.getProduct().getSku())
                        .quantity(item.getQuantity())
                        .unitPrice(item.getUnitPrice())
                        .totalPrice(item.getTotalPrice())
                        .build())
                .collect(Collectors.toList());

        return RefundDTO.builder()
                .id(refund.getId())
                .branchId(refund.getBranch().getId())
                .branchName(refund.getBranch().getName())
                .customerId(refund.getCustomer() != null ? refund.getCustomer().getId() : null)
                .customerName(refund.getCustomer() != null ? refund.getCustomer().getName() : null)
                .saleId(refund.getSale() != null ? refund.getSale().getId() : null)
                .saleNumber(refund.getSale() != null ? refund.getSale().getSaleNumber() : null)
                .userId(refund.getUser().getId())
                .userName(refund.getUser().getFullName())
                .refundNumber(refund.getRefundNumber())
                .refundDate(refund.getRefundDate())
                .totalAmount(refund.getTotalAmount())
                .refundMethod(refund.getRefundMethod())
                .status(refund.getStatus())
                .reason(refund.getReason())
                .items(items)
                .createdAt(refund.getCreatedAt())
                .build();
    }
}
