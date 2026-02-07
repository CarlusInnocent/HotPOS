package com.example.HotPOS.service;

import com.example.HotPOS.dto.ExpenseDTO;
import com.example.HotPOS.entity.Branch;
import com.example.HotPOS.entity.Expense;
import com.example.HotPOS.entity.User;
import com.example.HotPOS.exception.ResourceNotFoundException;
import com.example.HotPOS.repository.BranchRepository;
import com.example.HotPOS.repository.ExpenseRepository;
import com.example.HotPOS.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.HotPOS.enums.PaymentMethod;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final BranchRepository branchRepository;
    private final UserRepository userRepository;

    public List<ExpenseDTO> getExpensesByBranch(Long branchId) {
        return expenseRepository.findByBranchIdOrderByExpenseDateDesc(branchId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<ExpenseDTO> getExpensesByDateRange(Long branchId, LocalDate startDate, LocalDate endDate) {
        return expenseRepository.findByBranchAndDateRange(branchId, startDate, endDate).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<ExpenseDTO> getExpensesByCategory(Long branchId, String category) {
        return expenseRepository.findByBranchIdAndCategory(branchId, category).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public ExpenseDTO getExpenseById(Long id) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));
        return toDTO(expense);
    }

    @Transactional
    public ExpenseDTO createExpense(ExpenseDTO dto, Long userId) {
        Branch branch = branchRepository.findById(dto.getBranchId())
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found with id: " + dto.getBranchId()));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        String expenseNumber = generateExpenseNumber(branch.getCode());

        Expense expense = Expense.builder()
                .branch(branch)
                .user(user)
                .expenseNumber(expenseNumber)
                .expenseDate(dto.getExpenseDate() != null ? dto.getExpenseDate() : LocalDate.now())
                .category(dto.getCategory())
                .description(dto.getDescription())
                .amount(dto.getAmount())
                .paymentMethod(dto.getPaymentMethod() != null ? dto.getPaymentMethod() : PaymentMethod.CASH)
                .receiptNumber(dto.getReceiptNumber())
                .notes(dto.getNotes())
                .build();

        Expense saved = expenseRepository.save(expense);
        return toDTO(saved);
    }

    @Transactional
    public ExpenseDTO updateExpense(Long id, ExpenseDTO dto) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));

        expense.setExpenseDate(dto.getExpenseDate());
        expense.setCategory(dto.getCategory());
        expense.setDescription(dto.getDescription());
        expense.setAmount(dto.getAmount());
        expense.setReceiptNumber(dto.getReceiptNumber());
        expense.setNotes(dto.getNotes());

        Expense saved = expenseRepository.save(expense);
        return toDTO(saved);
    }

    @Transactional
    public void deleteExpense(Long id) {
        if (!expenseRepository.existsById(id)) {
            throw new ResourceNotFoundException("Expense not found with id: " + id);
        }
        expenseRepository.deleteById(id);
    }

    private String generateExpenseNumber(String branchCode) {
        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        return "EXP-" + branchCode + "-" + dateStr;
    }

    private ExpenseDTO toDTO(Expense expense) {
        return ExpenseDTO.builder()
                .id(expense.getId())
                .branchId(expense.getBranch().getId())
                .branchName(expense.getBranch().getName())
                .userId(expense.getUser().getId())
                .userName(expense.getUser().getFullName())
                .expenseNumber(expense.getExpenseNumber())
                .expenseDate(expense.getExpenseDate())
                .category(expense.getCategory())
                .description(expense.getDescription())
                .amount(expense.getAmount())
                .paymentMethod(expense.getPaymentMethod())
                .receiptNumber(expense.getReceiptNumber())
                .notes(expense.getNotes())
                .createdAt(expense.getCreatedAt())
                .build();
    }
}
