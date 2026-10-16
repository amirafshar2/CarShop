"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getSessionUser, isSessionRestored, refreshSession, subscribeSession, type SessionUser } from "@/lib/api";

let started = false;

/** Current signed-in user (restored once per page load from the HttpOnly refresh cookie). */
export function useSession(): { user: SessionUser | null; ready: boolean } {
  const user = useSyncExternalStore(subscribeSession, getSessionUser, () => null);
  const ready = useSyncExternalStore(subscribeSession, isSessionRestored, () => false);
  useEffect(() => {
    if (!started && !isSessionRestored()) {
      started = true;
      void refreshSession();
    }
  }, []);
  return { user, ready };
}
