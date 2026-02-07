package com.example.HotPOS.repository;

import com.example.HotPOS.entity.Branch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BranchRepository extends JpaRepository<Branch, Long> {
    
    Optional<Branch> findByCode(String code);
    
    List<Branch> findByIsActiveTrue();
    
    boolean existsByCode(String code);
}
