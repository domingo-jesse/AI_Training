import {
  pgTable,
  text,
  uuid,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { attemptsTable } from "./attempts";
import { moduleQuestionsTable } from "./modules";

export const CONVERSATION_ROLES = ["user", "assistant", "system"] as const;
export type ConversationRole = (typeof CONVERSATION_ROLES)[number];

export const questionConversationMessagesTable = pgTable("question_conversation_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  attemptId: uuid("attempt_id")
    .notNull()
    .references(() => attemptsTable.id, { onDelete: "cascade" }),
  questionId: uuid("question_id")
    .notNull()
    .references(() => moduleQuestionsTable.id),
  role: text("role").$type<ConversationRole>().notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertConversationMessageSchema = createInsertSchema(questionConversationMessagesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertConversationMessage = z.infer<typeof insertConversationMessageSchema>;
export type QuestionConversationMessage = typeof questionConversationMessagesTable.$inferSelect;
