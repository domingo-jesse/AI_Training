import { useLayoutEffect, useEffect } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";

const KEY = "ts_portal";
const TTL = 15 * 60 * 1000; // 15 minutes — plenty of time to complete OAuth

/** Call on the admin sign-in page to stamp intent before OAuth starts. */
export function useMarkAdminPortal() {
  useLayoutEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ portal: "admin", at: Date.now() }));
  }, []);
}

/**
 * After any sign-in (email OR Google OAuth) redirect to the right place:
 *   - "admin" stamp in localStorage  → /dashboard
 *   - no stamp / expired             → /learner/home
 *
 * `defaultDest` is used only if the user is already signed in when they
 * land on this page and no stamp exists (manual navigation).
 */
export function usePortalRedirect(defaultDest: string) {
  const { isSignedIn, isLoaded } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let dest = defaultDest;

    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const { portal, at } = JSON.parse(raw);
        if (portal === "admin" && Date.now() - at < TTL) {
          dest = "/dashboard";
        }
        localStorage.removeItem(KEY);
      }
    } catch {
      localStorage.removeItem(KEY);
    }

    setLocation(dest);
  }, [isLoaded, isSignedIn, defaultDest, setLocation]);
}
