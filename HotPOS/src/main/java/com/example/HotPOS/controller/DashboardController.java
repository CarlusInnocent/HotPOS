package com.example.HotPOS.controller;

import com.example.HotPOS.dto.DashboardStatsDTO;
import com.example.HotPOS.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<DashboardStatsDTO> getStats(@RequestParam(required = false) Long branchId) {
        if (branchId != null) {
            return ResponseEntity.ok(dashboardService.getStats(branchId));
        }
        return ResponseEntity.ok(dashboardService.getStats(null));
    }

    @GetMapping("/company")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DashboardStatsDTO> getCompanyStats() {
        return ResponseEntity.ok(dashboardService.getCompanyStats());
    }

    @GetMapping("/branch/{branchId}")
    public ResponseEntity<DashboardStatsDTO> getBranchStats(@PathVariable Long branchId) {
        return ResponseEntity.ok(dashboardService.getBranchStats(branchId));
    }
}
