import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "../../lib/Toast.jsx";
import EmergencyPage from "./EmergencyPage.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <EmergencyPage />
    </ToastProvider>
  </StrictMode>,
);
