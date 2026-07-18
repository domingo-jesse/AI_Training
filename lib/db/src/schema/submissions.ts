import {
  pgTable,
  text,
  uuid,
  integer,
  numeric,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { attemptsTable } from "./attempts";
import { moduleQuestionsTable } from "./modules";

export const GRADING_STATUSES = [
  "submitted",
  "pending_review",
  "ai_grading",
  "ai_graded_pending_review",
  "approved",
  "returned",
  "grading_failed",
] as const;
export type GradingStatus = (typeof GRADING_STATUSES)[number];

export const submissionScoresTable = pgTable("submission_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  attemptId: uuid("attempt_id")
    .notNull()
    .unique()
    .references(() => attemptsTable.id, { onDelete: "cascade" }),
  overallScore: numeric("overall_score", { precision: 6, scale: 2 }),
  maxScore: numeric("max_score", { precision: 6, scale: 2 }),
  gradingStatus: text("grading_status")
    .$type<GradingStatus>()
    .notNull()
    .default("submitted"),
  graderId: uuid("grader_id").references(() => usersTable.id),
  gradedAt: timestamp("graded_at", { withTimezone: true }),
  feedback: text("feedback"),
  visibilityFlags: jsonb("visibility_flags").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const submissionQuestionScoresTable = pgTable("submission_question_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionScoreId: uuid("submission_score_id")
    .notNull()
    .references(() => submissionScoresTable.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").references(() => moduleQuestionsTable.id),
  score: numeric("score", { precision: 6, scale: 2 }),
  maxScore: numeric("max_score", { precision: 6, scale: 2 }),
  feedback: text("feedback"),
  gradingMethod: text("grading_method").default("manual"), // manual | keyword | llm
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const submissionRegradeHistoryTable = pgTable("submission_regrade_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionScoreId: uuid("submission_score_id")
    .notNull()
    .references(() => submissionScoresTable.id, { onDelete: "cascade" }),
  previousScore: numeric("previous_score", { precision: 6, scale: 2 }),
  newScore: numeric("new_score", { precision: 6, scale: 2 }),
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  reason: text("reason"),
  regradedBy: uuid("regraded_by").references(() => usersTable.id),
  regradedAt: timestamp("regraded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSubmissionScoreSchema = createInsertSchema(submissionScoresTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubmissionScore = z.infer<typeof insertSubmissionScoreSchema>;
export type SubmissionScore = typeof submissionScoresTable.$inferSelect;
export type SubmissionQuestionScore = typeof submissionQuestionScoresTable.$inferSelect;
export type SubmissionRegradeHistory = typeof submissionRegradeHistoryTable.$inferSelect;
