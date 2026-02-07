package com.example.HotPOS.dto;

import com.example.HotPOS.enums.Role;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDTO {
    private Long id;
    private Long branchId;
    private String branchName;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private Role role;
    private Boolean isActive;
}
