package com.example.HotPOS.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "company_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanySettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_name", nullable = false, length = 200)
    @Builder.Default
    private String companyName = "HOTLINES";

    @Column(length = 20)
    private String phone;

    @Column(length = 100)
    private String email;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(length = 200)
    private String website;

    @Column(name = "tax_id", length = 50)
    private String taxId;

    @Column(name = "receipt_footer", columnDefinition = "TEXT")
    @Builder.Default
    private String receiptFooter = "Thank you for your purchase!";

    @Column(name = "receipt_tagline", length = 200)
    @Builder.Default
    private String receiptTagline = "Please come again";

    @Column(name = "currency_symbol", length = 10)
    @Builder.Default
    private String currencySymbol = "UGX";

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
