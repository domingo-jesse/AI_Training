import { type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { UserRole } from "@workspace/db";

/**
 * Requires a valid Clerk session. Attaches req.clerkUserId and, if available,
 * the local DB user to req.localUser.
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

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkUserId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found. Call /api/users/sync first." });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ error: "Account is inactive." });
    return;
  }

  (req as any).clerkUserId = clerkUserId;
  (req as any).localUser = user;
  next();
}

/**
 * Requires the local user to have one of the specified roles.
 * Must be used after requireLocalUser.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).localUser;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(user.role as UserRole)) {
      res.status(403).json({ error: "Forbidden: insufficient role" });
      return;
    }
    next();
  };
}

/**
 * Requires the local user to belong to the organization
 * specified in req.params.orgId or req.localUser.organizationId.
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
