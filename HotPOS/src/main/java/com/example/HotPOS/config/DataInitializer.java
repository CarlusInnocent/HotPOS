package com.example.HotPOS.config;

import com.example.HotPOS.entity.*;
import com.example.HotPOS.enums.Role;
import com.example.HotPOS.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final BranchRepository branchRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        initializeDefaultBranch();
        initializeAdmin();
    }

    private void initializeDefaultBranch() {
        if (branchRepository.count() == 0) {
            Branch defaultBranch = Branch.builder()
                    .name("Main Branch")
                    .code("MAIN")
                    .address("")
                    .phone("")
                    .email("")
                    .isActive(true)
                    .build();
            branchRepository.save(defaultBranch);
            log.info("Created default branch: Main Branch");
        }
    }

    private void initializeAdmin() {
        if (!userRepository.existsByUsername("admin")) {
            Branch mainBranch = branchRepository.findByCode("MAIN").orElse(null);
            if (mainBranch == null) return;

            User admin = User.builder()
                    .branch(mainBranch)
                    .username("admin")
                    .email("admin@hotpos.com")
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .fullName("System Administrator")
                    .role(Role.ADMIN)
                    .isActive(true)
                    .build();
            userRepository.save(admin);
            log.info("Created default admin - Username: admin, Password: admin123");
        }
    }
}
