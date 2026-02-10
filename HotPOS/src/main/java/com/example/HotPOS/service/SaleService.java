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
public class SaleService {

    private final SaleRepository saleRepository;
    private final BranchRepository branchRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final StockItemRepository stockItemRepository;
    private final SerialNumberRepository serialNumberRepository;
    private final RefundRepository refundRepository;

    public List<SaleDTO> getSalesByBranch(Long branchId) {
        List<Sale> sales = saleRepository.findByBranchIdOrderBySaleDateDesc(branchId);
        return toDTOList(sales);
    }

    public List<SaleDTO> getSalesByDateRange(Long branchId, LocalDate startDate, LocalDate endDate) {
        List<Sale> sales = saleRepository.findByBranchAndDateRange(branchId, startDate, endDate);
        return toDTOList(sales);
    }

    public List<SaleDTO> getTodaySales(Long branchId) {
        LocalDate today = LocalDate.now();
        List<Sale> sales = saleRepository.findByBranchAndDateRange(branchId, today, today);
        return toDTOList(sales);
    }

    public SaleDTO getSaleById(Long id) {
        Sale sale = saleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sale not found with id: " + id));
        return toDTOWithRefundStatus(sale);
    }

    public SaleDTO getSaleBySaleNumber(String saleNumber) {
        Sale sale = saleRepository.findBySaleNumber(saleNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Sale not found with number: " + saleNumber));
        return toDTOWithRefundStatus(sale);
    }

    @Transactional
    public SaleDTO createSale(CreateSaleDTO dto, Long userId) {
        Branch branch = branchRepository.findById(dto.getBranchId())
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found with id: " + dto.getBranchId()));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        Customer customer = null;
        if (dto.getCustomerId() != null) {
            customer = customerRepository.findById(dto.getCustomerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + dto.getCustomerId()));
        }

        // Generate identifiers
        LocalDate saleDate = LocalDate.now();
        Integer nextRefSeq = saleRepository.findMaxReferenceSequenceForBranch(branch.getId()) + 1;
        String saleNumber = generateSaleNumber(branch.getCode(), saleDate, nextRefSeq);
        String referenceNumber = generateReferenceNumber(nextRefSeq);

        Sale sale = Sale.builder()
                .branch(branch)
                .customer(customer)
                .user(user)
                .saleNumber(saleNumber)
                .referenceNumber(referenceNumber)
                .referenceSequence(nextRefSeq)
                .saleDate(saleDate)
                .customerName(customer == null && dto.getCustomerName() != null ? dto.getCustomerName().trim() : null)
                .paymentMethod(dto.getPaymentMethod())
                .paymentStatus(PaymentStatus.PAID)
                .discountAmount(dto.getDiscountAmount() != null ? dto.getDiscountAmount() : BigDecimal.ZERO)
                .notes(dto.getNotes())
                .items(new ArrayList<>())
                .build();

        BigDecimal totalAmount = BigDecimal.ZERO;

        for (CreateSaleItemDTO itemDto : dto.getItems()) {
            Product product = productRepository.findById(itemDto.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + itemDto.getProductId()));

            // Check stock availability
            StockItem stockItem = stockItemRepository.findByBranchIdAndProductId(branch.getId(), product.getId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Product " + product.getName() + " not available in this branch"));

            if (stockItem.getQuantity() < itemDto.getQuantity()) {
                throw new IllegalStateException(
                        "Insufficient stock for " + product.getName() + 
                        ". Available: " + stockItem.getQuantity() + ", Requested: " + itemDto.getQuantity());
            }

            // Use custom price if provided, otherwise branch-specific, otherwise product default
            BigDecimal unitPrice;
            if (itemDto.getUnitPrice() != null) {
                unitPrice = itemDto.getUnitPrice(); // Custom price from cashier
            } else if (stockItem.getSellingPrice() != null) {
                unitPrice = stockItem.getSellingPrice(); // Branch-specific price
            } else {
                unitPrice = product.getSellingPrice(); // Default product price
            }
            BigDecimal itemDiscount = itemDto.getDiscount() != null ? itemDto.getDiscount() : BigDecimal.ZERO;
            BigDecimal itemTotal = unitPrice.multiply(BigDecimal.valueOf(itemDto.getQuantity())).subtract(itemDiscount);

            SaleItem saleItem = SaleItem.builder()
                    .sale(sale)
                    .product(product)
                    .quantity(itemDto.getQuantity())
                    .unitPrice(unitPrice)
                    .costPrice(stockItem.getCostPrice())
                    .totalPrice(itemTotal)
                    .build();

            sale.getItems().add(saleItem);
            totalAmount = totalAmount.add(itemTotal);

            // Reduce stock
            stockItem.setQuantity(stockItem.getQuantity() - itemDto.getQuantity());
            stockItemRepository.save(stockItem);

            // Update serial numbers if applicable
            if (product.getRequiresSerial() && itemDto.getSerialNumbers() != null) {
                for (String serialNum : itemDto.getSerialNumbers()) {
                    SerialNumber serial = serialNumberRepository.findBySerialNumber(serialNum)
                            .orElseThrow(() -> new ResourceNotFoundException("Serial number not found: " + serialNum));
                    
                    if (serial.getStatus() != SerialNumberStatus.IN_STOCK) {
                        throw new IllegalStateException("Serial number " + serialNum + " is not available for sale");
                    }
                    
                    serial.setStatus(SerialNumberStatus.SOLD);
                    serial.setSale(sale);
                    serialNumberRepository.save(serial);
                }
            }
        }

        BigDecimal discountAmount = dto.getDiscountAmount() != null ? dto.getDiscountAmount() : BigDecimal.ZERO;
        BigDecimal grandTotal = totalAmount.subtract(discountAmount);

        sale.setTotalAmount(totalAmount);
        sale.setGrandTotal(grandTotal);

        Sale saved = saleRepository.save(sale);
        return toDTO(saved);
    }

    private String generateSaleNumber(String branchCode, LocalDate saleDate, Integer sequence) {
        String dateTimeStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String seqPart = String.format("%05d", sequence);
        return "SL-" + branchCode + "-" + dateTimeStr + "-" + seqPart;
    }

    private String generateReferenceNumber(Integer sequence) {
        String seqPart = String.format("%05d", sequence);
        return "REF-" + seqPart;
    }

    private SaleDTO toDTO(Sale sale) {
        List<SaleItemDTO> items = sale.getItems().stream()
                .map(item -> {
                    // Fetch serial numbers sold with this item
                    List<String> serials = null;
                    if (item.getProduct().getRequiresSerial()) {
                        serials = serialNumberRepository.findBySaleIdAndProductId(sale.getId(), item.getProduct().getId())
                                .stream()
                                .map(SerialNumber::getSerialNumber)
                                .collect(Collectors.toList());
                    }
                    return SaleItemDTO.builder()
                            .id(item.getId())
                            .productId(item.getProduct().getId())
                            .productName(item.getProduct().getName())
                            .productSku(item.getProduct().getSku())
                            .quantity(item.getQuantity())
                            .unitPrice(item.getUnitPrice())
                            .discount(BigDecimal.ZERO)
                            .totalPrice(item.getTotalPrice())
                            .serialNumbers(serials != null && !serials.isEmpty() ? serials : null)
                            .build();
                })
                .collect(Collectors.toList());

        return SaleDTO.builder()
                .id(sale.getId())
                .branchId(sale.getBranch().getId())
                .branchName(sale.getBranch().getName())
                .branchCode(sale.getBranch().getCode())
                .branchAddress(sale.getBranch().getAddress())
                .branchPhone(sale.getBranch().getPhone())
                .referenceNumber(sale.getReferenceNumber())
                .referenceSequence(sale.getReferenceSequence())
                .customerId(sale.getCustomer() != null ? sale.getCustomer().getId() : null)
                .customerName(sale.getCustomer() != null ? sale.getCustomer().getName() 
                    : (sale.getCustomerName() != null && !sale.getCustomerName().isEmpty() ? sale.getCustomerName() : "Walk-in Customer"))
                .userId(sale.getUser().getId())
                .userName(sale.getUser().getFullName())
                .saleNumber(sale.getSaleNumber())
                .saleDate(sale.getSaleDate())
                .totalAmount(sale.getTotalAmount())
                .taxAmount(sale.getTaxAmount())
                .discountAmount(sale.getDiscountAmount())
                .grandTotal(sale.getGrandTotal())
                .paymentMethod(sale.getPaymentMethod())
                .paymentStatus(sale.getPaymentStatus())
                .notes(sale.getNotes())
                .items(items)
                .createdAt(sale.getCreatedAt())
                .refundStatus("NONE")
                .refundedAmount(BigDecimal.ZERO)
                .build();
    }

    /**
     * Convert a single sale to DTO with refund status lookup.
     */
    private SaleDTO toDTOWithRefundStatus(Sale sale) {
        SaleDTO dto = toDTO(sale);
        BigDecimal refundedAmount = refundRepository.getTotalApprovedRefundsAmountBySale(sale.getId());
        if (refundedAmount.compareTo(BigDecimal.ZERO) > 0) {
            dto.setRefundedAmount(refundedAmount);
            if (refundedAmount.compareTo(dto.getGrandTotal()) >= 0) {
                dto.setRefundStatus("FULL");
            } else {
                dto.setRefundStatus("PARTIAL");
            }
        }
        return dto;
    }

    /**
     * Convert a list of sales to DTOs with batch refund status lookup.
     */
    private List<SaleDTO> toDTOList(List<Sale> sales) {
        List<SaleDTO> dtos = sales.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());

        // Batch lookup of refund amounts for all sales
        List<Long> saleIds = sales.stream().map(Sale::getId).collect(Collectors.toList());
        if (!saleIds.isEmpty()) {
            List<Object[]> refundData = refundRepository.getApprovedRefundAmountsBySaleIds(saleIds);
            java.util.Map<Long, BigDecimal> refundMap = new java.util.HashMap<>();
            for (Object[] row : refundData) {
                refundMap.put((Long) row[0], (BigDecimal) row[1]);
            }

            // Create a map from saleId to DTO for quick lookup
            java.util.Map<Long, SaleDTO> dtoMap = new java.util.HashMap<>();
            for (SaleDTO dto : dtos) {
                dtoMap.put(dto.getId(), dto);
            }

            for (java.util.Map.Entry<Long, BigDecimal> entry : refundMap.entrySet()) {
                SaleDTO dto = dtoMap.get(entry.getKey());
                if (dto != null) {
                    BigDecimal refundedAmount = entry.getValue();
                    dto.setRefundedAmount(refundedAmount);
                    if (refundedAmount.compareTo(dto.getGrandTotal()) >= 0) {
                        dto.setRefundStatus("FULL");
                    } else {
                        dto.setRefundStatus("PARTIAL");
                    }
                }
            }
        }

        return dtos;
    }
}
