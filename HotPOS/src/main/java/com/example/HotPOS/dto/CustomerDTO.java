package com.example.HotPOS.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerDTO {
    private Long id;
    private String name;
    private String phone;
    private String email;
    private String address;
    private String taxId;
    private Boolean isActive;
}
