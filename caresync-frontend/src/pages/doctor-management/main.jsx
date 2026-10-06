import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "../../lib/Toast.jsx";
import DoctorManagementPage from "./DoctorManagementPage.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <DoctorManagementPage />
    </ToastProvider>
  </StrictMode>,
);
