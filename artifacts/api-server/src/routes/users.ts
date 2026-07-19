import { Router, type IRouter } from "express";
import { db, users as usersTable } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";
import { requireAuth, requireLocalUser } from "../middleware/auth";
import { syncUserFromClerk } from "../services/authService";
import bcrypt from "bcryptjs";

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

  const { passwordHash: _ph, ...profile } = user;
  res.json(profile);
});

/**
 * POST /api/users/sync
 * JIT-provisions or updates the current Clerk user in the Supabase DB.
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

/**
 * PATCH /api/users/me
 * Self-update: name, username, email, password, emailNotificationsEnabled.
 * Validates uniqueness for username and email.
 * Password changes only allowed for local_password accounts.
 */
router.patch("/users/me", requireLocalUser, async (req, res): Promise<void> => {
  const localUser = (req as any).localUser;
  const { name, username, email, currentPassword, newPassword, emailNotificationsEnabled } = req.body;

  const updates: Record<string, any> = {};

  // ── Name ────────────────────────────────────────────────────────────────
  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) {
      res.status(400).json({ error: "validation", field: "name", message: "Name cannot be empty." });
      return;
    }
    updates.name = trimmed;
  }

  // ── Username ─────────────────────────────────────────────────────────────
  if (username !== undefined) {
    const uname = String(username).trim().toLowerCase();
    if (uname && !/^[a-z0-9_]{3,30}$/.test(uname)) {
      res.status(400).json({
        error: "validation", field: "username",
        message: "Username must be 3–30 characters: letters, numbers, and underscores only.",
      });
      return;
    }
    if (uname) {
      const [conflict] = await db
        .select({ userId: usersTable.userId })
        .from(usersTable)
        .where(and(eq(usersTable.username, uname), ne(usersTable.userId, localUser.userId)))
        .limit(1);
      if (conflict) {
        res.status(409).json({ error: "username_taken", field: "username", message: "That username is already taken." });
        return;
      }
    }
    updates.username = uname || null;
  }

  // ── Email ────────────────────────────────────────────────────────────────
  if (email !== undefined) {
    const em = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      res.status(400).json({ error: "validation", field: "email", message: "Please enter a valid email address." });
      return;
    }
    const [conflict] = await db
      .select({ userId: usersTable.userId })
      .from(usersTable)
      .where(and(eq(usersTable.email, em), ne(usersTable.userId, localUser.userId)))
      .limit(1);
    if (conflict) {
      res.status(409).json({ error: "email_taken", field: "email", message: "An account with that email already exists." });
      return;
    }
    updates.email = em;
  }

  // ── Password ─────────────────────────────────────────────────────────────
  if (newPassword !== undefined) {
    if (localUser.authProvider !== "local_password") {
      res.status(400).json({ error: "validation", field: "newPassword", message: "Password changes are only available for local accounts." });
      return;
    }
    if (!currentPassword) {
      res.status(400).json({ error: "validation", field: "currentPassword", message: "Please enter your current password." });
      return;
    }
    if (!localUser.passwordHash) {
      res.status(400).json({ error: "validation", field: "currentPassword", message: "No password is set on this account." });
      return;
    }
    const match = await bcrypt.compare(String(currentPassword), localUser.passwordHash);
    if (!match) {
      res.status(400).json({ error: "current_password_wrong", field: "currentPassword", message: "Current password is incorrect." });
      return;
    }
    const np = String(newPassword);
    if (np.length < 8) {
      res.status(400).json({ error: "validation", field: "newPassword", message: "New password must be at least 8 characters." });
      return;
    }
    updates.passwordHash = await bcrypt.hash(np, 10);
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  if (emailNotificationsEnabled !== undefined) {
    updates.emailNotificationsEnabled = Boolean(emailNotificationsEnabled);
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "validation", message: "No fields to update." });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.userId, localUser.userId))
    .returning();

  const { passwordHash: _ph, ...profile } = updated;
  res.json(profile);
});

export default router;
