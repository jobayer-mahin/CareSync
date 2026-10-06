import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "../../lib/Toast.jsx";
import DoctorDashboardPage from "./DoctorDashboardPage.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <DoctorDashboardPage />
    </ToastProvider>
  </StrictMode>,
);
