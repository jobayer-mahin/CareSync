import { useEffect, useState } from "react";
import { api } from "./api";
import { getSession } from "./api";

/**
 * Resolves the doctor row for the logged-in session. Ported from the
 * repeated loadProfile() logic in doctor-dashboard.js / doctor-schedule.js /
 * doctor-patients.js: match by userId or email, falling back to the first
 * doctor record for demo accounts (email starting with "doctor@").
 */
export function useMyDoctor() {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { email, userId } = getSession();
      try {
        const doctors = await api.getDoctors();
        let mine = (doctors || []).find((d) => d.userId == userId || d.email === email);
        if (!mine && email?.startsWith("doctor@")) mine = doctors?.[0];
        if (!cancelled) setDoctor(mine || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { doctor, loading };
}
