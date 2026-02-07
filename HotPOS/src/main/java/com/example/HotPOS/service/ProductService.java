package com.example.HotPOS.service;

import com.example.HotPOS.dto.ProductDTO;
import com.example.HotPOS.entity.Category;
import com.example.HotPOS.entity.Product;
import com.example.HotPOS.exception.ResourceNotFoundException;
import com.example.HotPOS.repository.CategoryRepository;
import com.example.HotPOS.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    public List<ProductDTO> getAllProducts() {
        return productRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<ProductDTO> getActiveProducts() {
        return productRepository.findByIsActiveTrue().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<ProductDTO> getProductsByCategory(Long categoryId) {
        return productRepository.findByCategoryId(categoryId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<ProductDTO> searchProducts(String search) {
        return productRepository.searchProducts(search).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public ProductDTO getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
        return toDTO(product);
    }

    public ProductDTO getProductBySku(String sku) {
        Product product = productRepository.findBySku(sku)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with SKU: " + sku));
        return toDTO(product);
    }

    @Transactional
    public ProductDTO createProduct(ProductDTO dto) {
        Category category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + dto.getCategoryId()));

        Product product = Product.builder()
                .category(category)
                .sku(dto.getSku())
                .name(dto.getName())
                .description(dto.getDescription())
                .unitOfMeasure(dto.getUnitOfMeasure())
                .requiresSerial(dto.getRequiresSerial() != null ? dto.getRequiresSerial() : false)
                .reorderLevel(dto.getReorderLevel() != null ? dto.getReorderLevel() : 10)
                .sellingPrice(dto.getSellingPrice())
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .build();
        
        Product saved = productRepository.save(product);
        return toDTO(saved);
    }

    @Transactional
    public ProductDTO updateProduct(Long id, ProductDTO dto) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));

        if (dto.getCategoryId() != null) {
            Category category = categoryRepository.findById(dto.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + dto.getCategoryId()));
            product.setCategory(category);
        }
        
        product.setSku(dto.getSku());
        product.setName(dto.getName());
        product.setDescription(dto.getDescription());
        product.setUnitOfMeasure(dto.getUnitOfMeasure());
        if (dto.getRequiresSerial() != null) {
            product.setRequiresSerial(dto.getRequiresSerial());
        }
        if (dto.getReorderLevel() != null) {
            product.setReorderLevel(dto.getReorderLevel());
        }
        product.setSellingPrice(dto.getSellingPrice());
        if (dto.getIsActive() != null) {
            product.setIsActive(dto.getIsActive());
        }
        
        Product saved = productRepository.save(product);
        return toDTO(saved);
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
        product.setIsActive(false);
        productRepository.save(product);
    }

    private ProductDTO toDTO(Product product) {
        return ProductDTO.builder()
                .id(product.getId())
                .categoryId(product.getCategory().getId())
                .categoryName(product.getCategory().getName())
                .sku(product.getSku())
                .name(product.getName())
                .description(product.getDescription())
                .unitOfMeasure(product.getUnitOfMeasure())
                .requiresSerial(product.getRequiresSerial())
                .reorderLevel(product.getReorderLevel())
                .sellingPrice(product.getSellingPrice())
                .isActive(product.getIsActive())
                .build();
    }
}
