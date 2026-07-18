import {
  pgTable,
  text,
  uuid,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";
import { modulesTable } from "./modules";

export const GENERATION_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
] as const;
export type GenerationStatus = (typeof GENERATION_STATUSES)[number];

export const moduleGenerationRunsTable = pgTable("module_generation_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizationsTable.id),
  creatorId: uuid("creator_id").references(() => usersTable.id),
  prompt: text("prompt").notNull(),
  model: text("model"),
  status: text("status")
    .$type<GenerationStatus>()
    .notNull()
    .default("pending"),
  output: jsonb("output"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const moduleGenerationQuestionsTable = pgTable("module_generation_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  generationRunId: uuid("generation_run_id")
    .notNull()
    .references(() => moduleGenerationRunsTable.id, { onDelete: "cascade" }),
  moduleId: uuid("module_id").references(() => modulesTable.id),
  questionData: jsonb("question_data").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertModuleGenerationRunSchema = createInsertSchema(moduleGenerationRunsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertModuleGenerationRun = z.infer<typeof insertModuleGenerationRunSchema>;
export type ModuleGenerationRun = typeof moduleGenerationRunsTable.$inferSelect;
export type ModuleGenerationQuestion = typeof moduleGenerationQuestionsTable.$inferSelect;
