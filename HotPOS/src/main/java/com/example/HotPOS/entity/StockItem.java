package com.example.HotPOS.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "stock_items", 
    uniqueConstraints = @UniqueConstraint(name = "unique_product_per_branch", columnNames = {"product_id", "branch_id"}),
    indexes = {
        @Index(name = "idx_stock_branch", columnList = "branch_id"),
        @Index(name = "idx_stock_product", columnList = "product_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @Column(nullable = false)
    @Builder.Default
    private Integer quantity = 0;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal costPrice; // Cost price for this branch

    @Column(precision = 15, scale = 2)
    private BigDecimal sellingPrice; // Selling price for this branch (if null, use Product.sellingPrice)

    @Column
    private LocalDateTime lastStockDate;

    @OneToMany(mappedBy = "stockItem", cascade = CascadeType.ALL)
    @Builder.Default
    private List<SerialNumber> serialNumbers = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
