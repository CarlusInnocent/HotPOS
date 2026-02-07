package com.example.HotPOS.service;

import com.example.HotPOS.dto.BranchDTO;
import com.example.HotPOS.entity.Branch;
import com.example.HotPOS.exception.ResourceNotFoundException;
import com.example.HotPOS.repository.BranchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BranchService {

    private final BranchRepository branchRepository;

    public List<BranchDTO> getAllBranches() {
        return branchRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<BranchDTO> getActiveBranches() {
        return branchRepository.findByIsActiveTrue().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public BranchDTO getBranchById(Long id) {
        Branch branch = branchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found with id: " + id));
        return toDTO(branch);
    }

    @Transactional
    public BranchDTO createBranch(BranchDTO dto) {
        Branch branch = Branch.builder()
                .name(dto.getName())
                .code(dto.getCode())
                .address(dto.getAddress())
                .phone(dto.getPhone())
                .email(dto.getEmail())
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .build();
        Branch saved = branchRepository.save(branch);
        return toDTO(saved);
    }

    @Transactional
    public BranchDTO updateBranch(Long id, BranchDTO dto) {
        Branch branch = branchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found with id: " + id));
        
        branch.setName(dto.getName());
        branch.setCode(dto.getCode());
        branch.setAddress(dto.getAddress());
        branch.setPhone(dto.getPhone());
        branch.setEmail(dto.getEmail());
        if (dto.getIsActive() != null) {
            branch.setIsActive(dto.getIsActive());
        }
        
        Branch saved = branchRepository.save(branch);
        return toDTO(saved);
    }

    @Transactional
    public void deleteBranch(Long id) {
        Branch branch = branchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found with id: " + id));
        branch.setIsActive(false);
        branchRepository.save(branch);
    }

    private BranchDTO toDTO(Branch branch) {
        return BranchDTO.builder()
                .id(branch.getId())
                .name(branch.getName())
                .code(branch.getCode())
                .address(branch.getAddress())
                .phone(branch.getPhone())
                .email(branch.getEmail())
                .isActive(branch.getIsActive())
                .build();
    }
}
