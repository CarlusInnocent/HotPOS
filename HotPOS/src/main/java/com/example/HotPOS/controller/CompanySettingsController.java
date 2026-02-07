package com.example.HotPOS.controller;

import com.example.HotPOS.entity.CompanySettings;
import com.example.HotPOS.service.CompanySettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/company-settings")
@RequiredArgsConstructor
public class CompanySettingsController {

    private final CompanySettingsService service;

    @GetMapping
    public ResponseEntity<CompanySettings> getSettings() {
        return ResponseEntity.ok(service.getSettings());
    }

    @PutMapping
    public ResponseEntity<CompanySettings> updateSettings(@RequestBody CompanySettings settings) {
        return ResponseEntity.ok(service.updateSettings(settings));
    }
}
