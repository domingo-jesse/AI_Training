import { db, users as usersTable, organizations, organizationMemberships } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

interface SyncUserParams {
  clerkId: string;   // stored in users.id (text external-id column)
  email: string;
  name?: string | null;
  authProvider?: string;
}

/**
 * JIT-provision or update a user in the local DB based on their Clerk identity.
 * Supabase schema: users.id (text) = external/Clerk ID, users.user_id (bigint) = PK.
 * Returns { user, created }.
 */
export async function syncUserFromClerk(
  params: SyncUserParams,
): Promise<{ user: typeof usersTable.$inferSelect; created: boolean }> {
  const { clerkId, email, name, authProvider = "clerk" } = params;

  // 1. Match on Clerk ID (primary)
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, clerkId))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(usersTable)
      .set({ email, name: name ?? existing.name, authProvider })
      .where(eq(usersTable.id, clerkId))
      .returning();

    // Ensure they have an org membership (may be missing for users created before this fix)
    if (updated.organizationId) {
      await ensureOrgMembership(updated.userId, updated.organizationId, updated.role ?? "learner");
    }

    logger.info({ userId: updated.userId, clerkId }, "User synced (updated)");
    return { user: updated, created: false };
  }

  // 2. Fallback: match on email for admin-pre-created accounts (id starts with "pending_")
  const [emailMatch] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (emailMatch && (!emailMatch.id || emailMatch.id.startsWith("pending_"))) {
    const [updated] = await db
      .update(usersTable)
      .set({ id: clerkId, email, name: name ?? emailMatch.name, authProvider, isActive: true })
      .where(eq(usersTable.userId, emailMatch.userId))
      .returning();

    // Ensure org membership
    if (updated.organizationId) {
      await ensureOrgMembership(updated.userId, updated.organizationId, updated.role ?? "learner");
    }

    logger.info({ userId: updated.userId, clerkId }, "User synced (linked pre-created account)");
    return { user: updated, created: false };
  }

  // Determine organization: use first existing org or create a default one
  let [org] = await db.select().from(organizations).limit(1);

  if (!org) {
    const domain = email.split("@")[1] ?? "default";
    const [newOrg] = await db
      .insert(organizations)
      .values({ name: `${domain} Organization` })
      .returning();
    org = newOrg;
    logger.info({ orgId: org.organizationId, domain }, "Default organization created");
  }

  // Count existing users in org to determine role
  const existingUsers = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.organizationId, org.organizationId));

  const isFirstUser = existingUsers.length === 0;
  const role = isFirstUser ? "admin" : "learner";

  const [newUser] = await db
    .insert(usersTable)
    .values({
      id: clerkId,
      email,
      name: name ?? "User",
      role,
      organizationId: org.organizationId,
      authProvider,
      isActive: true,
    })
    .returning();

  // Add to org membership so they appear in all admin views immediately
  await ensureOrgMembership(newUser.userId, org.organizationId, role);

  logger.info(
    { userId: newUser.userId, clerkId, role: newUser.role, orgId: org.organizationId },
    "User provisioned",
  );

  return { user: newUser, created: true };
}

/**
 * Upsert an active org membership for a user.
 * If one already exists (any status), reactivate it and sync the role.
 */
async function ensureOrgMembership(
  userId: number,
  organizationId: number,
  role: string,
): Promise<void> {
  const [existing] = await db
    .select({ id: organizationMemberships.id })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(organizationMemberships)
      .set({ status: "active", role })
      .where(eq(organizationMemberships.id, existing.id));
  } else {
    await db.insert(organizationMemberships).values({
      userId,
      organizationId,
      role,
      status: "active",
    });
    logger.info({ userId, organizationId, role }, "Org membership created");
  }
}
