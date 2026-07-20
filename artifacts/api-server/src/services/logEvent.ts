import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

/**
 * Write a structured entry to system_logs.
 * Never throws — logging must not crash the request.
 */
export async function logEvent(opts: {
  level?: "info" | "warn" | "error";
  category?: string;
  message: string;
  metadata?: Record<string, unknown>;
  orgId?: number | null;
  userId?: string | null;
}): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO system_logs (level, category, message, metadata, org_id, user_id)
      VALUES (
        ${opts.level ?? "info"},
        ${opts.category ?? "general"},
        ${opts.message},
        ${opts.metadata ? JSON.stringify(opts.metadata) : null}::jsonb,
        ${opts.orgId ?? null},
        ${opts.userId ?? null}
      )
    `);
  } catch {
    // Intentionally swallowed — log failures must not affect API responses
  }
}
