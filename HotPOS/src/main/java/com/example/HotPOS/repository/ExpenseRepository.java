package com.example.HotPOS.repository;

import com.example.HotPOS.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    
    Optional<Expense> findByExpenseNumber(String expenseNumber);
    
    boolean existsByExpenseNumber(String expenseNumber);
    
    List<Expense> findByBranchId(Long branchId);
    
    List<Expense> findByCategory(String category);
    
    List<Expense> findByBranchIdAndExpenseDateBetween(Long branchId, LocalDate startDate, LocalDate endDate);
    
    @Query("SELECT DISTINCT e.category FROM Expense e ORDER BY e.category")
    List<String> findAllCategories();
    
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.branch.id = :branchId AND " +
           "e.expenseDate BETWEEN :startDate AND :endDate")
    BigDecimal getTotalExpensesByBranchAndPeriod(@Param("branchId") Long branchId, 
                                                  @Param("startDate") LocalDate startDate, 
                                                  @Param("endDate") LocalDate endDate);
    
    @Query("SELECT e.category, SUM(e.amount) FROM Expense e WHERE e.branch.id = :branchId AND " +
           "e.expenseDate BETWEEN :startDate AND :endDate GROUP BY e.category")
    List<Object[]> getExpensesByCategory(@Param("branchId") Long branchId, 
                                          @Param("startDate") LocalDate startDate, 
                                          @Param("endDate") LocalDate endDate);

    List<Expense> findByBranchIdOrderByExpenseDateDesc(Long branchId);

    @Query("SELECT e FROM Expense e WHERE e.branch.id = :branchId AND e.expenseDate BETWEEN :startDate AND :endDate ORDER BY e.expenseDate DESC")
    List<Expense> findByBranchAndDateRange(@Param("branchId") Long branchId, 
                                            @Param("startDate") LocalDate startDate, 
                                            @Param("endDate") LocalDate endDate);

    List<Expense> findByBranchIdAndCategory(Long branchId, String category);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.expenseDate BETWEEN :startDate AND :endDate")
    BigDecimal getTotalExpensesAmount(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.branch.id = :branchId AND e.expenseDate BETWEEN :startDate AND :endDate")
    BigDecimal getTotalExpensesAmountByBranch(@Param("branchId") Long branchId, 
                                               @Param("startDate") LocalDate startDate, 
                                               @Param("endDate") LocalDate endDate);
}
