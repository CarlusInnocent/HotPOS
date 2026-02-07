package com.example.HotPOS.service;

import com.example.HotPOS.entity.CompanySettings;
import com.example.HotPOS.repository.CompanySettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CompanySettingsService {

    private final CompanySettingsRepository repository;

    public CompanySettings getSettings() {
        return repository.findAll().stream().findFirst()
                .orElseGet(() -> repository.save(CompanySettings.builder().build()));
    }

    @Transactional
    public CompanySettings updateSettings(CompanySettings updated) {
        CompanySettings settings = getSettings();
        if (updated.getCompanyName() != null) settings.setCompanyName(updated.getCompanyName());
        if (updated.getPhone() != null) settings.setPhone(updated.getPhone());
        if (updated.getEmail() != null) settings.setEmail(updated.getEmail());
        if (updated.getAddress() != null) settings.setAddress(updated.getAddress());
        if (updated.getWebsite() != null) settings.setWebsite(updated.getWebsite());
        if (updated.getTaxId() != null) settings.setTaxId(updated.getTaxId());
        if (updated.getReceiptFooter() != null) settings.setReceiptFooter(updated.getReceiptFooter());
        if (updated.getReceiptTagline() != null) settings.setReceiptTagline(updated.getReceiptTagline());
        if (updated.getCurrencySymbol() != null) settings.setCurrencySymbol(updated.getCurrencySymbol());
        return repository.save(settings);
    }
}
