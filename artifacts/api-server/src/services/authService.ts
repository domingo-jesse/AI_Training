import { db, users as usersTable, organizations } from "@workspace/db";
import { eq } from "drizzle-orm";
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

  // Check if user already exists (match on the text `id` column = Clerk user ID)
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
    logger.info({ userId: updated.userId, clerkId }, "User synced (updated)");
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

  const [newUser] = await db
    .insert(usersTable)
    .values({
      id: clerkId,              // Clerk user ID goes in the text `id` field
      email,
      name: name ?? "User",
      role: isFirstUser ? "admin" : "learner",
      organizationId: org.organizationId,
      authProvider,
      isActive: true,
    })
    .returning();

  logger.info(
    { userId: newUser.userId, clerkId, role: newUser.role, orgId: org.organizationId },
    "User provisioned",
  );

  return { user: newUser, created: true };
}
