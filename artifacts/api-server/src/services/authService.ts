import { db, usersTable, organizationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import type { User } from "@workspace/db";

interface SyncUserParams {
  clerkId: string;
  email: string;
  name?: string | null;
  authProvider?: string;
}

/**
 * JIT-provision or update a user in the local DB based on their Clerk identity.
 * Returns { user, created } where created=true if a new row was inserted.
 *
 * On first sign-in:
 *  - If no default org exists, create one named after the user's email domain.
 *  - Create the user record with role='learner' by default.
 *
 * On subsequent sign-ins:
 *  - Update email/name/authProvider in case they changed in Clerk.
 */
export async function syncUserFromClerk(
  params: SyncUserParams,
): Promise<{ user: User; created: boolean }> {
  const { clerkId, email, name, authProvider = "clerk" } = params;

  // Check if user already exists
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))
    .limit(1);

  if (existing) {
    // Update mutable fields that may change in Clerk
    const [updated] = await db
      .update(usersTable)
      .set({ email, name: name ?? existing.name, authProvider })
      .where(eq(usersTable.clerkId, clerkId))
      .returning();

    logger.info({ userId: updated.id, clerkId }, "User synced (updated)");
    return { user: updated, created: false };
  }

  // Determine organization: use first existing org or create a default one
  let [org] = await db.select().from(organizationsTable).limit(1);

  if (!org) {
    const domain = email.split("@")[1] ?? "default";
    const [newOrg] = await db
      .insert(organizationsTable)
      .values({
        name: `${domain} Organization`,
        slug: domain.replace(/\./g, "-"),
        settings: {},
      })
      .returning();
    org = newOrg;
    logger.info({ orgId: org.id, domain }, "Default organization created");
  }

  // Create the user — first user in an org becomes admin
  const [orgUserCount] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.organizationId, org.id));

  const isFirstUser = !orgUserCount;

  const [newUser] = await db
    .insert(usersTable)
    .values({
      clerkId,
      email,
      name: name ?? null,
      role: isFirstUser ? "admin" : "learner",
      organizationId: org.id,
      authProvider,
      isActive: true,
    })
    .returning();

  logger.info(
    { userId: newUser.id, clerkId, role: newUser.role, orgId: org.id },
    "User provisioned",
  );

  return { user: newUser, created: true };
}
