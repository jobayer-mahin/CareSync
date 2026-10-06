import { useEffect, useState } from "react";
import { getSession, clearSession } from "./api";

/**
 * Replaces CareSyncUI.requireAuth() + the per-page role checks
 * (`if (userRole !== "DOCTOR") window.location.href = "dashboard.html"`).
 *
 * @param {string|null} requiredRole - "ADMIN" | "DOCTOR" | "PATIENT" | null (any authenticated role)
 * @returns {{ session: {token,email,role,userId}, ready: boolean }}
 */
export function useAuthGuard(requiredRole = null) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const s = getSession();
    if (!s.token) {
      window.location.href = "/index.html";
      return;
    }
    if (requiredRole && s.role !== requiredRole) {
      window.location.href = "/dashboard.html";
      return;
    }
    setSession(s);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { session, ready };
}

export function logout() {
  clearSession();
  window.location.href = "/index.html";
}
