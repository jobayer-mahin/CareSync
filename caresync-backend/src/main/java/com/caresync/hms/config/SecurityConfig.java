package com.caresync.hms.config;

import com.caresync.hms.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .headers(headers -> headers.frameOptions(frame -> frame.disable()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/symptoms/**").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/patients/**").hasAnyRole("ADMIN", "DOCTOR", "PATIENT")
                .requestMatchers("/api/patients/**").hasAnyRole("ADMIN", "DOCTOR")
                .requestMatchers(HttpMethod.GET, "/api/doctors/**").hasAnyRole("ADMIN", "DOCTOR", "PATIENT")
                .requestMatchers("/api/doctors/**").hasAnyRole("ADMIN", "DOCTOR")
                .requestMatchers(HttpMethod.GET, "/api/departments/**").hasAnyRole("ADMIN", "DOCTOR", "PATIENT")
                .requestMatchers("/api/departments/**").hasRole("ADMIN")
                .requestMatchers("/api/appointments/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/invoices/**").hasAnyRole("ADMIN", "DOCTOR", "PATIENT")
                .requestMatchers("/api/invoices/**").hasAnyRole("ADMIN", "DOCTOR")
                .requestMatchers("/api/emergency/**").hasAnyRole("ADMIN", "DOCTOR")
                .requestMatchers("/api/dashboard/**").authenticated()
                .requestMatchers("/api/ehr-documents/**").authenticated()
                .requestMatchers("/api/messages/**", "/api/notifications/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/bed-rates/**").hasAnyRole("ADMIN", "DOCTOR")
                .requestMatchers("/api/bed-rates/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            // Missing / invalid / expired token -> 401 (instead of Spring's default 403)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
