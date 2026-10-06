import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "../../lib/Toast.jsx";
import PatientDashboardPage from "./PatientDashboardPage.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <PatientDashboardPage />
    </ToastProvider>
  </StrictMode>,
);
