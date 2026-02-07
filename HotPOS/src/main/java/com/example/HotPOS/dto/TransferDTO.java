package com.example.HotPOS.dto;

import com.example.HotPOS.enums.TransferStatus;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransferDTO {
    private Long id;
    private Long fromBranchId;
    private String fromBranchName;
    private Long toBranchId;
    private String toBranchName;
    private Long requestedById;
    private String requestedByName;
    private Long approvedById;
    private String approvedByName;
    private String transferNumber;
    private LocalDate transferDate;
    private TransferStatus status;
    private String notes;
    private List<TransferItemDTO> items;
    private LocalDateTime createdAt;
}
