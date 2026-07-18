import {
  pgTable,
  text,
  uuid,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const MODULE_STATUSES = ["draft", "published", "archived"] as const;
export type ModuleStatus = (typeof MODULE_STATUSES)[number];

export const QUESTION_TYPES = [
  "open_text",
  "multiple_choice",
  "ai_conversation",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const modulesTable = pgTable("modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizationsTable.id),
  creatorId: uuid("creator_id").references(() => usersTable.id),
  title: text("title").notNull(),
  category: text("category"),
  difficulty: text("difficulty").$type<DifficultyLevel>().default("intermediate"),
  description: text("description"),
  scenarioTicket: text("scenario_ticket"),
  roleFocus: text("role_focus"),
  testFocus: text("test_focus"),
  learningObjectives: text("learning_objectives").array(),
  contentSections: jsonb("content_sections").default([]),
  estimatedTime: integer("estimated_time"), // minutes
  timeLimit: integer("time_limit"), // minutes
  status: text("status").$type<ModuleStatus>().notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const moduleQuestionsTable = pgTable("module_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  moduleId: uuid("module_id")
    .notNull()
    .references(() => modulesTable.id, { onDelete: "cascade" }),
  order: integer("order").notNull().default(0),
  questionText: text("question_text").notNull(),
  rationale: text("rationale"),
  questionType: text("question_type")
    .$type<QuestionType>()
    .notNull()
    .default("open_text"),
  options: jsonb("options").default([]), // for multiple_choice
  expectedAnswer: text("expected_answer"),
  answerGuidance: text("answer_guidance"),
  scoringMethod: text("scoring_method").default("manual"), // manual | keyword | llm
  maxPoints: integer("max_points").notNull().default(10),
  keywordExpectedTerms: text("keyword_expected_terms").array(),
  llmGradingCriteria: text("llm_grading_criteria"),
  learnerVisibleFeedbackMode: text("learner_visible_feedback_mode").default("none"),
  aiConversationPrompt: text("ai_conversation_prompt"),
  aiRolePersona: text("ai_role_persona"),
  evaluationFocus: text("evaluation_focus"),
  maxLearnerResponses: integer("max_learner_responses").default(4),
  wrapUpInstruction: text("wrap_up_instruction"),
  sourceGenerationRunId: uuid("source_generation_run_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const moduleRubricCriteriaTable = pgTable("module_rubric_criteria", {
  id: uuid("id").primaryKey().defaultRandom(),
  moduleId: uuid("module_id")
    .notNull()
    .references(() => modulesTable.id, { onDelete: "cascade" }),
  criterionName: text("criterion_name").notNull(),
  description: text("description"),
  maxPoints: integer("max_points").notNull().default(10),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const investigationActionsTable = pgTable("investigation_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  moduleId: uuid("module_id")
    .notNull()
    .references(() => modulesTable.id, { onDelete: "cascade" }),
  actionType: text("action_type").notNull(),
  description: text("description"),
  content: jsonb("content").default({}),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertModuleSchema = createInsertSchema(modulesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertModuleQuestionSchema = createInsertSchema(moduleQuestionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertModule = z.infer<typeof insertModuleSchema>;
export type Module = typeof modulesTable.$inferSelect;
export type InsertModuleQuestion = z.infer<typeof insertModuleQuestionSchema>;
export type ModuleQuestion = typeof moduleQuestionsTable.$inferSelect;
export type ModuleRubricCriteria = typeof moduleRubricCriteriaTable.$inferSelect;
export type InvestigationAction = typeof investigationActionsTable.$inferSelect;
