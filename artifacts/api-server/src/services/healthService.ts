/**
 * Health service — thin wrapper for now.
 * Extend to include DB connectivity checks, dependency pings, etc.
 */
export function getHealthStatus(): { status: string } {
  return { status: "ok" };
}
