import {
  pgTable,
  text,
  uuid,
  boolean,
  integer,
  jsonb,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";
import { modulesTable } from "./modules";

export const ASSIGNMENT_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
  "overdue",
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const assignmentsTable = pgTable("assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizationsTable.id),
  moduleId: uuid("module_id")
    .notNull()
    .references(() => modulesTable.id),
  createdBy: uuid("created_by").references(() => usersTable.id),
  isActive: boolean("is_active").notNull().default(true),
  dueDate: date("due_date", { mode: "string" }),
  assignedDate: date("assigned_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// Links individual learners to an assignment (many learners per assignment)
export const moduleAssignmentsTable = pgTable("module_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  assignmentId: uuid("assignment_id")
    .notNull()
    .references(() => assignmentsTable.id, { onDelete: "cascade" }),
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => usersTable.id),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizationsTable.id),
  status: text("status").$type<AssignmentStatus>().notNull().default("not_started"),
  attemptCount: integer("attempt_count").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// Persists in-progress workspace state so learners can resume
export const assignmentWorkspaceStateTable = pgTable("assignment_workspace_state", {
  id: uuid("id").primaryKey().defaultRandom(),
  assignmentId: uuid("assignment_id")
    .notNull()
    .references(() => assignmentsTable.id),
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => usersTable.id),
  currentStep: integer("current_step").notNull().default(0),
  answers: jsonb("answers").default({}),
  actionLog: jsonb("action_log").default([]),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  isSubmitted: boolean("is_submitted").notNull().default(false),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
});

export const insertAssignmentSchema = createInsertSchema(assignmentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignmentsTable.$inferSelect;
export type ModuleAssignment = typeof moduleAssignmentsTable.$inferSelect;
export type AssignmentWorkspaceState = typeof assignmentWorkspaceStateTable.$inferSelect;
