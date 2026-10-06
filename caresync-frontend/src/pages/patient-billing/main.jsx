import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "../../lib/Toast.jsx";
import PatientBillingPage from "./PatientBillingPage.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <PatientBillingPage />
    </ToastProvider>
  </StrictMode>,
);
