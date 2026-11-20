"use client";

import { useCallback, useState } from "react";

/**
 * Saves one profile section via PATCH /api/profile/:section.
 * status: "idle" | "saving" | "saved" | "error"; `error` holds the server message.
 */
export function useSectionSave(section, onSaved) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const save = useCallback(
    async (body) => {
      setStatus("saving");
      setError("");
      try {
        const res = await fetch(`/api/profile/${section}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus("error");
          setError(data.error || "Couldn't save. Try again.");
          return null;
        }
        setStatus("saved");
        onSaved?.(data);
        setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 2200);
        return data;
      } catch {
        setStatus("error");
        setError("You appear to be offline. Try again.");
        return null;
      }
    },
    [section, onSaved],
  );

  const clearError = useCallback(() => {
    setError("");
    setStatus((s) => (s === "error" ? "idle" : s));
  }, []);

  return { save, status, error, clearError };
}
