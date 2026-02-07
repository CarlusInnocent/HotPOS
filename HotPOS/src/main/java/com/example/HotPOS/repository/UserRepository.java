package com.example.HotPOS.repository;

import com.example.HotPOS.entity.User;
import com.example.HotPOS.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByUsername(String username);
    
    Optional<User> findByEmail(String email);
    
    List<User> findByBranchId(Long branchId);
    
    List<User> findByBranchIdAndIsActiveTrue(Long branchId);
    
    List<User> findByIsActiveTrue();
    
    List<User> findByRole(Role role);
    
    boolean existsByUsername(String username);
    
    boolean existsByEmail(String email);
}
