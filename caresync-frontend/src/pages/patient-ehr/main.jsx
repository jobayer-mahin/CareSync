import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "../../lib/Toast.jsx";
import PatientEhrPage from "./PatientEhrPage.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <PatientEhrPage />
    </ToastProvider>
  </StrictMode>,
);
