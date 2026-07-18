import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireLocalUser } from "../middleware/auth";
import { syncUserFromClerk } from "../services/authService";

const router: IRouter = Router();

/**
 * GET /api/users/me
 * Returns the current user's local DB profile (role, org, etc.)
 * Requires a valid Clerk session + local DB row.
 */
router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = (req as any).clerkUserId as string;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkUserId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found. Call /api/users/sync first." });
    return;
  }

  res.json(user);
});

/**
 * POST /api/users/sync
 * JIT-provisions or updates the current Clerk user in the local DB.
 * Call this once after sign-in before any other API calls.
 */
router.post("/users/sync", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = (req as any).clerkUserId as string;
  const { email, name, authProvider } = req.body;

  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "email is required" });
    return;
  }

  const { user, created } = await syncUserFromClerk({
    clerkId: clerkUserId,
    email,
    name: name ?? null,
    authProvider: authProvider ?? "clerk",
  });

  req.log.info({ userId: user.id, created }, "User sync completed");
  res.status(created ? 201 : 200).json(user);
});

export default router;
