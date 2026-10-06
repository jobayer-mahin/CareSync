import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "../../lib/Toast.jsx";
import LoginPage from "./LoginPage.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <LoginPage />
    </ToastProvider>
  </StrictMode>,
);
