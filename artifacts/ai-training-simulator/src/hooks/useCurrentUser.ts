import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/react';
import { useGetMe, useSyncUser } from '@workspace/api-client-react';

export function useCurrentUser() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const { data: localUser, isLoading: isLocalLoading, error, refetch } = useGetMe({
    query: {
      enabled: !!clerkUser,
      retry: false
    }
  });

  const syncUser = useSyncUser();
  const syncAttempted = useRef(false);

  useEffect(() => {
    // Orval wrap error inside `error` object or sometimes returns it directly. We'll just check if there's an error.
    if (clerkUser && error && !syncAttempted.current) {
      // Assuming 404 or User not found error triggers sync
      syncAttempted.current = true;
      syncUser.mutate(
        {
          data: {
            email: clerkUser.primaryEmailAddress?.emailAddress || '',
            name: clerkUser.fullName || '',
            authProvider: 'clerk'
          }
        },
        {
          onSuccess: () => {
            refetch();
          }
        }
      );
    }
  }, [clerkUser, error, refetch, syncUser]);

  return {
    localUser,
    clerkUser,
    isLoading: !isClerkLoaded || (!!clerkUser && isLocalLoading) || syncUser.isPending,
    error
  };
}
