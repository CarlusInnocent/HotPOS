package com.example.HotPOS.service;

import com.example.HotPOS.dto.*;
import com.example.HotPOS.entity.*;
import com.example.HotPOS.enums.SerialNumberStatus;
import com.example.HotPOS.enums.TransferStatus;
import com.example.HotPOS.exception.ResourceNotFoundException;
import com.example.HotPOS.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TransferService {

    private final TransferRepository transferRepository;
    private final BranchRepository branchRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final StockItemRepository stockItemRepository;
    private final SerialNumberRepository serialNumberRepository;

    public List<TransferDTO> getTransfersByFromBranch(Long branchId) {
        return transferRepository.findByFromBranchIdOrderByTransferDateDescCreatedAtDesc(branchId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<TransferDTO> getTransfersByToBranch(Long branchId) {
        return transferRepository.findByToBranchIdOrderByTransferDateDescCreatedAtDesc(branchId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<TransferDTO> getPendingTransfers(Long branchId) {
        return transferRepository.findPendingTransfers(branchId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public TransferDTO getTransferById(Long id) {
        Transfer transfer = transferRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transfer not found with id: " + id));
        return toDTO(transfer);
    }

    @Transactional
    public TransferDTO createTransfer(CreateTransferDTO dto, Long userId) {
        Branch fromBranch = branchRepository.findById(dto.getFromBranchId())
                .orElseThrow(() -> new ResourceNotFoundException("Source branch not found with id: " + dto.getFromBranchId()));
        
        Branch toBranch = branchRepository.findById(dto.getToBranchId())
                .orElseThrow(() -> new ResourceNotFoundException("Destination branch not found with id: " + dto.getToBranchId()));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (dto.getFromBranchId().equals(dto.getToBranchId())) {
            throw new IllegalStateException("Source and destination branch cannot be the same");
        }

        String transferNumber = generateTransferNumber(fromBranch.getCode(), toBranch.getCode());

        Transfer transfer = Transfer.builder()
                .fromBranch(fromBranch)
                .toBranch(toBranch)
                .user(user)
                .transferNumber(transferNumber)
                .transferDate(LocalDate.now())
                .status(TransferStatus.PENDING)
                .notes(dto.getNotes())
                .items(new ArrayList<>())
                .build();

        for (CreateTransferItemDTO itemDto : dto.getItems()) {
            Product product = productRepository.findById(itemDto.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + itemDto.getProductId()));

            // Check stock availability
            StockItem stockItem = stockItemRepository.findByBranchIdAndProductId(fromBranch.getId(), product.getId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Product " + product.getName() + " not available in source branch"));

            if (stockItem.getQuantity() < itemDto.getQuantity()) {
                throw new IllegalStateException(
                        "Insufficient stock for " + product.getName() + 
                        ". Available: " + stockItem.getQuantity() + ", Requested: " + itemDto.getQuantity());
            }

            TransferItem transferItem = TransferItem.builder()
                    .transfer(transfer)
                    .product(product)
                    .quantity(itemDto.getQuantity())
                    .costPrice(stockItem.getCostPrice())
                    .build();

            transfer.getItems().add(transferItem);
        }

        Transfer saved = transferRepository.save(transfer);
        return toDTO(saved);
    }

    /**
     * Send the transfer - deducts stock from source branch and marks as IN_TRANSIT
     */
    @Transactional
    public TransferDTO sendTransfer(Long transferId, Long sentById) {
        Transfer transfer = transferRepository.findById(transferId)
                .orElseThrow(() -> new ResourceNotFoundException("Transfer not found with id: " + transferId));

        if (transfer.getStatus() != TransferStatus.PENDING) {
            throw new IllegalStateException("Transfer must be in PENDING status to send");
        }

        // Deduct stock from source branch
        for (TransferItem item : transfer.getItems()) {
            StockItem fromStock = stockItemRepository.findByBranchIdAndProductId(
                    transfer.getFromBranch().getId(), item.getProduct().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Stock item not found"));

            if (fromStock.getQuantity() < item.getQuantity()) {
                throw new IllegalStateException(
                        "Insufficient stock for " + item.getProduct().getName() +
                        ". Available: " + fromStock.getQuantity() + ", Requested: " + item.getQuantity());
            }

            fromStock.setQuantity(fromStock.getQuantity() - item.getQuantity());
            stockItemRepository.save(fromStock);

            // Update serial numbers to TRANSFERRED status
            if (item.getProduct().getRequiresSerial()) {
                List<SerialNumber> serials = serialNumberRepository.findByStockItemIdAndStatus(
                        fromStock.getId(), SerialNumberStatus.IN_STOCK);
                int count = 0;
                for (SerialNumber serial : serials) {
                    if (count >= item.getQuantity()) break;
                    serial.setStatus(SerialNumberStatus.TRANSFERRED);
                    serialNumberRepository.save(serial);
                    count++;
                }
            }
        }

        transfer.setStatus(TransferStatus.IN_TRANSIT);
        transfer.setSentAt(LocalDateTime.now());

        Transfer saved = transferRepository.save(transfer);
        return toDTO(saved);
    }

    /**
     * Receive the transfer - adds stock to destination branch
     */
    @Transactional
    public TransferDTO receiveTransfer(Long transferId, Long receivedById) {
        Transfer transfer = transferRepository.findById(transferId)
                .orElseThrow(() -> new ResourceNotFoundException("Transfer not found with id: " + transferId));

        if (transfer.getStatus() != TransferStatus.IN_TRANSIT) {
            throw new IllegalStateException("Transfer must be IN_TRANSIT to receive");
        }

        User receivedBy = userRepository.findById(receivedById)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + receivedById));

        // Add stock to destination branch
        for (TransferItem item : transfer.getItems()) {
            StockItem toStock = stockItemRepository.findByBranchIdAndProductId(
                    transfer.getToBranch().getId(), item.getProduct().getId())
                    .orElse(StockItem.builder()
                            .branch(transfer.getToBranch())
                            .product(item.getProduct())
                            .quantity(0)
                            .costPrice(item.getCostPrice())
                            .build());

            toStock.setQuantity(toStock.getQuantity() + item.getQuantity());
            toStock.setLastStockDate(LocalDateTime.now());
            StockItem savedToStock = stockItemRepository.save(toStock);

            // Update serial numbers - move to new branch and set to IN_STOCK
            if (item.getProduct().getRequiresSerial()) {
                StockItem fromStock = stockItemRepository.findByBranchIdAndProductId(
                        transfer.getFromBranch().getId(), item.getProduct().getId())
                        .orElse(null);
                
                if (fromStock != null) {
                    List<SerialNumber> serials = serialNumberRepository.findByStockItemIdAndStatus(
                            fromStock.getId(), SerialNumberStatus.TRANSFERRED);
                    int count = 0;
                    for (SerialNumber serial : serials) {
                        if (count >= item.getQuantity()) break;
                        serial.setStockItem(savedToStock);
                        serial.setStatus(SerialNumberStatus.IN_STOCK);
                        serialNumberRepository.save(serial);
                        count++;
                    }
                }
            }
        }

        transfer.setStatus(TransferStatus.RECEIVED);
        transfer.setReceivedBy(receivedBy);
        transfer.setReceivedAt(LocalDateTime.now());

        Transfer saved = transferRepository.save(transfer);
        return toDTO(saved);
    }

    @Transactional
    public TransferDTO approveTransfer(Long transferId, Long approvedById) {
        Transfer transfer = transferRepository.findById(transferId)
                .orElseThrow(() -> new ResourceNotFoundException("Transfer not found with id: " + transferId));

        if (transfer.getStatus() != TransferStatus.PENDING) {
            throw new IllegalStateException("Transfer is not in pending status");
        }

        User receivedBy = userRepository.findById(approvedById)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + approvedById));

        // Process the transfer - move stock
        for (TransferItem item : transfer.getItems()) {
            // Reduce from source branch
            StockItem fromStock = stockItemRepository.findByBranchIdAndProductId(
                    transfer.getFromBranch().getId(), item.getProduct().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Stock item not found"));

            fromStock.setQuantity(fromStock.getQuantity() - item.getQuantity());
            stockItemRepository.save(fromStock);

            // Add to destination branch
            StockItem toStock = stockItemRepository.findByBranchIdAndProductId(
                    transfer.getToBranch().getId(), item.getProduct().getId())
                    .orElse(StockItem.builder()
                            .branch(transfer.getToBranch())
                            .product(item.getProduct())
                            .quantity(0)
                            .costPrice(fromStock.getCostPrice())
                            .build());

            toStock.setQuantity(toStock.getQuantity() + item.getQuantity());
            toStock.setLastStockDate(LocalDateTime.now());
            StockItem savedToStock = stockItemRepository.save(toStock);

            // Update serial numbers if applicable
            if (item.getProduct().getRequiresSerial()) {
                List<SerialNumber> serials = serialNumberRepository.findByStockItemId(fromStock.getId());
                int count = 0;
                for (SerialNumber serial : serials) {
                    if (count >= item.getQuantity()) break;
                    if (serial.getStatus() == SerialNumberStatus.IN_STOCK) {
                        serial.setStockItem(savedToStock);
                        serial.setStatus(SerialNumberStatus.IN_STOCK); // Keep as IN_STOCK at new branch
                        serialNumberRepository.save(serial);
                        count++;
                    }
                }
            }
        }

        transfer.setStatus(TransferStatus.RECEIVED);
        transfer.setReceivedBy(receivedBy);
        transfer.setReceivedAt(LocalDateTime.now());

        Transfer saved = transferRepository.save(transfer);
        return toDTO(saved);
    }

    @Transactional
    public TransferDTO rejectTransfer(Long transferId, Long userId) {
        Transfer transfer = transferRepository.findById(transferId)
                .orElseThrow(() -> new ResourceNotFoundException("Transfer not found with id: " + transferId));

        if (transfer.getStatus() == TransferStatus.RECEIVED) {
            throw new IllegalStateException("Cannot reject a received transfer");
        }

        // If IN_TRANSIT, restore stock to source branch
        if (transfer.getStatus() == TransferStatus.IN_TRANSIT) {
            for (TransferItem item : transfer.getItems()) {
                StockItem fromStock = stockItemRepository.findByBranchIdAndProductId(
                        transfer.getFromBranch().getId(), item.getProduct().getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Stock item not found"));

                fromStock.setQuantity(fromStock.getQuantity() + item.getQuantity());
                stockItemRepository.save(fromStock);

                // Restore serial numbers to IN_STOCK
                if (item.getProduct().getRequiresSerial()) {
                    List<SerialNumber> serials = serialNumberRepository.findByStockItemIdAndStatus(
                            fromStock.getId(), SerialNumberStatus.TRANSFERRED);
                    int count = 0;
                    for (SerialNumber serial : serials) {
                        if (count >= item.getQuantity()) break;
                        serial.setStatus(SerialNumberStatus.IN_STOCK);
                        serialNumberRepository.save(serial);
                        count++;
                    }
                }
            }
        }

        transfer.setStatus(TransferStatus.REJECTED);

        Transfer saved = transferRepository.save(transfer);
        return toDTO(saved);
    }

    private String generateTransferNumber(String fromCode, String toCode) {
        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        return "TR-" + fromCode + "-" + toCode + "-" + dateStr;
    }

    private TransferDTO toDTO(Transfer transfer) {
        List<TransferItemDTO> items = transfer.getItems().stream()
                .map(item -> TransferItemDTO.builder()
                        .id(item.getId())
                        .productId(item.getProduct().getId())
                        .productName(item.getProduct().getName())
                        .productSku(item.getProduct().getSku())
                        .quantity(item.getQuantity())
                        .build())
                .collect(Collectors.toList());

        return TransferDTO.builder()
                .id(transfer.getId())
                .fromBranchId(transfer.getFromBranch().getId())
                .fromBranchName(transfer.getFromBranch().getName())
                .toBranchId(transfer.getToBranch().getId())
                .toBranchName(transfer.getToBranch().getName())
                .requestedById(transfer.getUser().getId())
                .requestedByName(transfer.getUser().getFullName())
                .approvedById(transfer.getReceivedBy() != null ? transfer.getReceivedBy().getId() : null)
                .approvedByName(transfer.getReceivedBy() != null ? transfer.getReceivedBy().getFullName() : null)
                .transferNumber(transfer.getTransferNumber())
                .transferDate(transfer.getTransferDate())
                .status(transfer.getStatus())
                .notes(transfer.getNotes())
                .items(items)
                .createdAt(transfer.getCreatedAt())
                .build();
    }
}
