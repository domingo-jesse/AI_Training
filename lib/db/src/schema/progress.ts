import {
  pgTable,
  text,
  uuid,
  numeric,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";
import { modulesTable } from "./modules";

export const COMPLETION_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
] as const;
export type CompletionStatus = (typeof COMPLETION_STATUSES)[number];

export const learnerProfilesTable = pgTable("learner_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizationsTable.id),
  team: text("team"),
  skills: text("skills").array(),
  preferences: jsonb("preferences").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const moduleProgressTable = pgTable("module_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => usersTable.id),
  moduleId: uuid("module_id")
    .notNull()
    .references(() => modulesTable.id),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizationsTable.id),
  completionStatus: text("completion_status")
    .$type<CompletionStatus>()
    .notNull()
    .default("not_started"),
  score: numeric("score", { precision: 6, scale: 2 }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLearnerProfileSchema = createInsertSchema(learnerProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLearnerProfile = z.infer<typeof insertLearnerProfileSchema>;
export type LearnerProfile = typeof learnerProfilesTable.$inferSelect;
export type ModuleProgress = typeof moduleProgressTable.$inferSelect;
