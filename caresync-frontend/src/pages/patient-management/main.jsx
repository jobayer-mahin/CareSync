import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "../../lib/Toast.jsx";
import PatientManagementPage from "./PatientManagementPage.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <PatientManagementPage />
    </ToastProvider>
  </StrictMode>,
);
