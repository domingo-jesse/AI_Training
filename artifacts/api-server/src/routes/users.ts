import { Router, type IRouter } from "express";
import { db, users as usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { syncUserFromClerk } from "../services/authService";

const router: IRouter = Router();

/**
 * GET /api/users/me
 * Returns the current user's Supabase DB profile (role, org, etc.)
 * Matches on users.id (text) = Clerk user ID.
 */
router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = (req as any).clerkUserId as string;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, clerkUserId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found. Call /api/users/sync first." });
    return;
  }

  // Return a clean profile (omit password_hash)
  const { passwordHash: _ph, ...profile } = user;
  res.json(profile);
});

/**
 * POST /api/users/sync
 * JIT-provisions or updates the current Clerk user in the Supabase DB.
 * Call once after sign-in before any other API calls.
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

  const { passwordHash: _ph, ...profile } = user;
  res.status(created ? 201 : 200).json(profile);
});

export default router;
