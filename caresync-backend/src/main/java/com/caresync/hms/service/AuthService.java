package com.caresync.hms.service;

import com.caresync.hms.dto.ForgotPasswordRequest;
import com.caresync.hms.dto.LoginRequest;
import com.caresync.hms.dto.LoginResponse;
import com.caresync.hms.exception.InvalidCredentialsException;
import com.caresync.hms.model.User;
import com.caresync.hms.model.Patient;
import com.caresync.hms.model.Doctor;
import com.caresync.hms.repository.DoctorRepository;
import com.caresync.hms.repository.PatientRepository;
import com.caresync.hms.repository.UserRepository;
import com.caresync.hms.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    private static final int MAX_RESET_ATTEMPTS = 5;
    private static final long RESET_WINDOW_MS = 15 * 60 * 1000L;
    /** identifier -> {failed attempts, window start}. Simple in-memory brute-force guard. */
    private final Map<String, long[]> resetAttempts = new ConcurrentHashMap<>();

    @Transactional
    public LoginResponse login(LoginRequest request) {
        String identifier = request.getIdentifier() == null ? "" : request.getIdentifier().trim();
        User user = userRepository.findByEmail(identifier)
                .orElseGet(() -> patientRepository.findByPatientCode(identifier)
                        .map(Patient::getUser)
                        .orElse(null));

        if (user == null) {
            throw new InvalidCredentialsException("Invalid email/ID or password");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        if (request.getRole() != null && !request.getRole().isBlank()
                && !user.getRole().equalsIgnoreCase(request.getRole())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new InvalidCredentialsException("Account is deactivated");
        }

        // Update last login
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole(), user.getId());

        LoginResponse response = new LoginResponse();
        response.setToken(token);
        response.setEmail(user.getEmail());
        response.setRole(user.getRole());
        response.setUserId(user.getId());
        response.setMessage("Login successful");

        return response;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new InvalidCredentialsException("User not found"));

        return Map.of(
                "userId", user.getId(),
                "email", user.getEmail(),
                "role", user.getRole(),
                "isActive", user.getIsActive(),
                "lastLogin", user.getLastLogin() != null ? user.getLastLogin().toString() : ""
        );
    }

    /**
     * Forgot-password for patients and doctors. The person proves who they are with their
     * login ID (email / Patient ID) plus the phone number registered on their profile,
     * then chooses a new password.
     */
    @Transactional
    public Map<String, String> resetPassword(ForgotPasswordRequest request) {
        String identifier = request.getIdentifier() == null ? "" : request.getIdentifier().trim();
        String key = identifier.toLowerCase();
        String newPassword = request.getNewPassword();

        if (newPassword == null || newPassword.length() < 6) {
            throw new IllegalArgumentException("New password must be at least 6 characters");
        }
        checkResetAllowed(key);

        User user = userRepository.findByEmail(identifier)
                .orElseGet(() -> patientRepository.findByPatientCode(identifier)
                        .map(Patient::getUser)
                        .orElse(null));

        String mismatch = "The details you entered do not match our records";
        if (user == null || !Boolean.TRUE.equals(user.getIsActive())
                || !("PATIENT".equals(user.getRole()) || "DOCTOR".equals(user.getRole()))) {
            registerFailure(key);
            throw new IllegalArgumentException(mismatch);
        }

        String registeredPhone = null;
        if ("PATIENT".equals(user.getRole())) {
            registeredPhone = patientRepository.findByUser_Id(user.getId()).map(Patient::getPhone).orElse(null);
        } else {
            registeredPhone = doctorRepository.findByUser_Id(user.getId()).map(Doctor::getPhone).orElse(null);
        }

        String given = normalizePhone(request.getPhone());
        String stored = normalizePhone(registeredPhone);
        if (stored.length() < 5 || !stored.equals(given)) {
            registerFailure(key);
            throw new IllegalArgumentException(mismatch);
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        resetAttempts.remove(key);
        return Map.of("message", "Password updated. You can now sign in with your new password.");
    }

    private static String normalizePhone(String phone) {
        return phone == null ? "" : phone.replaceAll("[^0-9A-Za-z]", "").toLowerCase();
    }

    private void checkResetAllowed(String key) {
        long[] state = resetAttempts.get(key);
        if (state == null) return;
        if (System.currentTimeMillis() - state[1] > RESET_WINDOW_MS) {
            resetAttempts.remove(key);
            return;
        }
        if (state[0] >= MAX_RESET_ATTEMPTS) {
            throw new IllegalArgumentException("Too many failed attempts. Please try again in 15 minutes");
        }
    }

    private void registerFailure(String key) {
        resetAttempts.compute(key, (k, state) -> {
            long now = System.currentTimeMillis();
            if (state == null || now - state[1] > RESET_WINDOW_MS) return new long[]{1, now};
            state[0]++;
            return state;
        });
    }
}
