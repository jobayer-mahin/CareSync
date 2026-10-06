import { useEffect, useState } from "react";
import { api } from "./api";
import { getSession } from "./api";

/** Ported from the repeated loadProfile() logic in patient-*.js files. */
export function useMyPatient() {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { email, userId } = getSession();
      try {
        const patients = await api.getPatients();
        let mine = (patients || []).find((p) => p.userId == userId || p.email === email);
        if (!mine && email?.startsWith("patient@")) mine = patients?.[0];
        if (!cancelled) setPatient(mine || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { patient, loading };
}
