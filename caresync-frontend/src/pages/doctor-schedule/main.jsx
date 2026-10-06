import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "../../lib/Toast.jsx";
import DoctorSchedulePage from "./DoctorSchedulePage.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <DoctorSchedulePage />
    </ToastProvider>
  </StrictMode>,
);
