import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "../../lib/Toast.jsx";
import PatientAppointmentsPage from "./PatientAppointmentsPage.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <PatientAppointmentsPage />
    </ToastProvider>
  </StrictMode>,
);
