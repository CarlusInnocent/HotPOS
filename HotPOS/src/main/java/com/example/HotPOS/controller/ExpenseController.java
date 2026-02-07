package com.example.HotPOS.controller;

import com.example.HotPOS.dto.ExpenseDTO;
import com.example.HotPOS.security.UserPrincipal;
import com.example.HotPOS.service.ExpenseService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CASHIER')")
public class ExpenseController {

    private final ExpenseService expenseService;

    @GetMapping("/branch/{branchId}")
    public ResponseEntity<List<ExpenseDTO>> getExpensesByBranch(@PathVariable Long branchId) {
        return ResponseEntity.ok(expenseService.getExpensesByBranch(branchId));
    }

    @GetMapping("/branch/{branchId}/range")
    public ResponseEntity<List<ExpenseDTO>> getExpensesByDateRange(
            @PathVariable Long branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(expenseService.getExpensesByDateRange(branchId, startDate, endDate));
    }

    @GetMapping("/branch/{branchId}/category/{category}")
    public ResponseEntity<List<ExpenseDTO>> getExpensesByCategory(
            @PathVariable Long branchId,
            @PathVariable String category) {
        return ResponseEntity.ok(expenseService.getExpensesByCategory(branchId, category));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExpenseDTO> getExpenseById(@PathVariable Long id) {
        return ResponseEntity.ok(expenseService.getExpenseById(id));
    }

    @PostMapping
    public ResponseEntity<ExpenseDTO> createExpense(
            @RequestBody ExpenseDTO dto,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(expenseService.createExpense(dto, userPrincipal.getId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExpenseDTO> updateExpense(@PathVariable Long id, @RequestBody ExpenseDTO dto) {
        return ResponseEntity.ok(expenseService.updateExpense(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExpense(@PathVariable Long id) {
        expenseService.deleteExpense(id);
        return ResponseEntity.noContent().build();
    }
}
