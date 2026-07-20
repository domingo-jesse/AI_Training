import { type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, users as usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const PLATFORM_OWNER_EMAILS = (process.env.PLATFORM_OWNER_EMAILS ?? "domingo.jesse@gmail.com")
  .split(",").map(e => e.trim().toLowerCase());

export function isPlatformOwner(user: any): boolean {
  return !!(user?.email && PLATFORM_OWNER_EMAILS.includes(user.email.toLowerCase()));
}

// ── In-memory user cache ────────────────────────────────────────────────────
// Eliminates a DB round-trip on every authenticated request.
// TTL: 60 s. Max size: 10,000 entries (auto-evicts oldest).

const userCache = new Map<string, { user: any; expiresAt: number }>();
const USER_CACHE_TTL = 60_000;

function getCachedUser(clerkUserId: string): any | null {
  const entry = userCache.get(clerkUserId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { userCache.delete(clerkUserId); return null; }
  return entry.user;
}

function setCachedUser(clerkUserId: string, user: any): void {
  if (userCache.size >= 10_000) {
    const firstKey = userCache.keys().next().value;
    if (firstKey) userCache.delete(firstKey);
  }
  userCache.set(clerkUserId, { user, expiresAt: Date.now() + USER_CACHE_TTL });
}

/** Call this whenever a user record is mutated (role change, deactivation, etc.). */
export function invalidateUserCache(clerkUserId: string): void {
  userCache.delete(clerkUserId);
}

// ───────────────────────────────────────────────────────────────────────────

/**
 * Requires a valid Clerk session. Attaches req.clerkUserId.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;

  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  (req as any).clerkUserId = clerkUserId;
  next();
}

/**
 * Requires a valid Clerk session AND the user to exist in the local DB.
 * Results are cached for 60 s per Clerk user ID to avoid per-request DB hits.
 * Matches on users.id (text) = Clerk user ID.
 * Attaches req.localUser.
 */
export async function requireLocalUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;

  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Check cache first — avoids a DB hit on every request
  let user = getCachedUser(clerkUserId);

  if (!user) {
    const [dbUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, clerkUserId))
      .limit(1);

    if (!dbUser) {
      res.status(404).json({ error: "User not found. Call /api/users/sync first." });
      return;
    }

    setCachedUser(clerkUserId, dbUser);
    user = dbUser;
  }

  if (!user.isActive) {
    res.status(403).json({ error: "Account is inactive." });
    return;
  }

  (req as any).clerkUserId = clerkUserId;

  // Platform owner impersonation — honour override headers
  if (isPlatformOwner(user)) {
    const orgOverride = req.headers["x-owner-org"] as string | undefined;
    const roleOverride = req.headers["x-owner-role"] as string | undefined;
    (req as any).localUser = {
      ...user,
      _isPlatformOwner: true,
      ...(orgOverride && roleOverride && !isNaN(Number(orgOverride))
        ? { organizationId: Number(orgOverride), role: roleOverride }
        : {}),
    };
  } else {
    (req as any).localUser = user;
  }

  next();
}

/**
 * Requires the local user to have one of the specified roles.
 * Must be used after requireLocalUser.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).localUser;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(user.role)) {
      res.status(403).json({ error: "Forbidden: insufficient role" });
      return;
    }
    next();
  };
}

/**
 * Attaches req.orgId from the local user's organization.
 * Must be used after requireLocalUser.
 */
export function requireOrgAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const user = (req as any).localUser;
  if (!user?.organizationId) {
    res.status(403).json({ error: "User is not assigned to an organization" });
    return;
  }
  (req as any).orgId = user.organizationId;
  next();
}
