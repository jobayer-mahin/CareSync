import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        dashboard: resolve(__dirname, "dashboard.html"),
        patientManagement: resolve(__dirname, "patient-management.html"),
        doctorManagement: resolve(__dirname, "doctor-management.html"),
        departmentManagement: resolve(__dirname, "department-management.html"),
        appointmentSystem: resolve(__dirname, "appointment-system.html"),
        billingSystem: resolve(__dirname, "billing-system.html"),
        emergency: resolve(__dirname, "emergency.html"),
        doctorDashboard: resolve(__dirname, "doctor-dashboard.html"),
        doctorSchedule: resolve(__dirname, "doctor-schedule.html"),
        doctorPatients: resolve(__dirname, "doctor-patients.html"),
        patientDashboard: resolve(__dirname, "patient-dashboard.html"),
        patientAppointments: resolve(__dirname, "patient-appointments.html"),
        patientBilling: resolve(__dirname, "patient-billing.html"),
        patientEhr: resolve(__dirname, "patient-ehr.html"),
      },
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**", "src/pages/patient-appointments/**", "src/components/**"],
      exclude: ["src/**/*.test.*", "src/tests/**", "src/pages/**/main.jsx"],
    },
  },
});
