import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "../../lib/Toast.jsx";
import DoctorPatientsPage from "./DoctorPatientsPage.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <DoctorPatientsPage />
    </ToastProvider>
  </StrictMode>,
);
