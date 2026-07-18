import { useEffect } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";

const PORTAL_KEY = "loginPortal";

/**
 * Stores which portal (admin | learner) the user signed in from, then
 * redirects them to the right home after sign-in completes — including
 * after Google / SSO OAuth flows that bounce through /sign-in.
 *
 * Storage is set only while the user is signed OUT, so it won't be
 * overwritten by whichever page Clerk lands on after the OAuth callback.
 */
export function usePortalRedirect(portal: "admin" | "learner") {
  const { isSignedIn, isLoaded } = useUser();
  const [, setLocation] = useLocation();

  // Remember the portal while the user is signed out (before OAuth starts)
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      sessionStorage.setItem(PORTAL_KEY, portal);
    }
  }, [isLoaded, isSignedIn, portal]);

  // Once signed in, redirect based on the stored portal
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const intent = sessionStorage.getItem(PORTAL_KEY) ?? portal;
      sessionStorage.removeItem(PORTAL_KEY);
      if (intent === "admin") {
        setLocation("/dashboard");
      } else {
        setLocation("/learner/home");
      }
    }
  }, [isLoaded, isSignedIn, portal, setLocation]);
}
