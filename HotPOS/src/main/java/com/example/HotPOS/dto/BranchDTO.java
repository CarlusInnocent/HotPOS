package com.example.HotPOS.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BranchDTO {
    private Long id;
    private String name;
    private String code;
    private String address;
    private String phone;
    private String email;
    private Boolean isActive;
}
