import { useEffect } from "react";
import { useLocation } from "wouter";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/**
 * After any sign-in (including Google OAuth), redirects the user
 * to the correct home page based on their role.
 */
export function useRoleRedirect() {
  const { localUser, isLoading } = useCurrentUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && localUser) {
      if (localUser.role === "admin" || localUser.role === "developer") {
        setLocation("/dashboard");
      } else {
        setLocation("/learner/home");
      }
    }
  }, [localUser, isLoading, setLocation]);
}
