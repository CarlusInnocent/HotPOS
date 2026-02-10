package com.example.HotPOS.entity;

import com.example.HotPOS.enums.PaymentMethod;
import com.example.HotPOS.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sales", indexes = {
    @Index(name = "idx_sales_number", columnList = "sale_number"),
    @Index(name = "idx_sales_branch", columnList = "branch_id"),
    @Index(name = "idx_sales_customer", columnList = "customer_id"),
    @Index(name = "idx_sales_date", columnList = "sale_date"),
    @Index(name = "idx_sales_status", columnList = "payment_status"),
    @Index(name = "idx_sales_ref_seq", columnList = "branch_id,sale_date,reference_sequence")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sale {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer; // NULL for walk-in customers

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // Cashier who made the sale

    @Column(nullable = false, unique = true, length = 50)
    private String saleNumber;

    // Branch-specific, daily-incrementing reference for tracking
    @Column(name = "reference_number", length = 80, unique = true)
    private String referenceNumber;

    @Column(name = "reference_sequence")
    private Integer referenceSequence;

    @Column(nullable = false)
    private LocalDate saleDate;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal grandTotal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.PAID;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "customer_name", length = 200)
    private String customerName; // Quick name for walk-in customers without full record

    @OneToMany(mappedBy = "sale", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<SaleItem> items = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // Helper method to add items
    public void addItem(SaleItem item) {
        items.add(item);
        item.setSale(this);
    }

    public void removeItem(SaleItem item) {
        items.remove(item);
        item.setSale(null);
    }
}
