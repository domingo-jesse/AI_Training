import { useEffect } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";

/**
 * If the user is already signed in when they land on a sign-in page
 * (e.g. they navigated there manually), send them to `destination`.
 * This is NOT the post-OAuth redirect — Clerk handles that via forceRedirectUrl.
 */
export function useSignedInRedirect(destination: string) {
  const { isSignedIn, isLoaded } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setLocation(destination);
    }
  }, [isLoaded, isSignedIn, destination, setLocation]);
}
