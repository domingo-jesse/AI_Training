import {
  pgTable,
  text,
  uuid,
  boolean,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";
import { modulesTable } from "./modules";
import { assignmentsTable } from "./assignments";

export const ATTEMPT_STATUSES = [
  "in_progress",
  "submitted",
  "graded",
] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

export const attemptsTable = pgTable("attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  assignmentId: uuid("assignment_id").references(() => assignmentsTable.id),
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => usersTable.id),
  moduleId: uuid("module_id")
    .notNull()
    .references(() => modulesTable.id),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizationsTable.id),
  status: text("status").$type<AttemptStatus>().notNull().default("in_progress"),
  currentStep: integer("current_step").notNull().default(0),
  answers: jsonb("answers").default({}),
  isSubmitted: boolean("is_submitted").notNull().default(false),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const actionLogsTable = pgTable("action_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  attemptId: uuid("attempt_id")
    .notNull()
    .references(() => attemptsTable.id, { onDelete: "cascade" }),
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => usersTable.id),
  actionType: text("action_type").notNull(),
  actionData: jsonb("action_data").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAttemptSchema = createInsertSchema(attemptsTable).omit({
  id: true,
  updatedAt: true,
});

export type InsertAttempt = z.infer<typeof insertAttemptSchema>;
export type Attempt = typeof attemptsTable.$inferSelect;
export type ActionLog = typeof actionLogsTable.$inferSelect;
