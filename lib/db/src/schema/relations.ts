import { relations } from "drizzle-orm/relations";
import { attempts, submissionRegradeHistory, users, questionConversationMessages, moduleQuestions, modules, organizations, moduleGenerationRuns, investigationActions, submissionSettings, assignments, assignmentWorkspaceState, submissionScores, actionLogs, moduleGenerationQuestions } from "./supabase";

export const submissionRegradeHistoryRelations = relations(submissionRegradeHistory, ({one}) => ({
	attempt: one(attempts, {
		fields: [submissionRegradeHistory.attemptId],
		references: [attempts.attemptId]
	}),
	user: one(users, {
		fields: [submissionRegradeHistory.changedByUserId],
		references: [users.userId]
	}),
}));

export const attemptsRelations = relations(attempts, ({one, many}) => ({
	submissionRegradeHistories: many(submissionRegradeHistory),
	questionConversationMessages: many(questionConversationMessages),
	module: one(modules, {
		fields: [attempts.moduleId],
		references: [modules.moduleId]
	}),
	organization: one(organizations, {
		fields: [attempts.organizationId],
		references: [organizations.organizationId]
	}),
	user: one(users, {
		fields: [attempts.userId],
		references: [users.userId]
	}),
	submissionScores: many(submissionScores),
	actionLogs: many(actionLogs),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	submissionRegradeHistories: many(submissionRegradeHistory),
	attempts: many(attempts),
	moduleGenerationRuns: many(moduleGenerationRuns),
	assignmentWorkspaceStates: many(assignmentWorkspaceState),
	modules: many(modules),
	organization: one(organizations, {
		fields: [users.organizationId],
		references: [organizations.organizationId]
	}),
	assignments_assignedBy: many(assignments, {
		relationName: "assignments_assignedBy_users_userId"
	}),
	assignments_learnerId: many(assignments, {
		relationName: "assignments_learnerId_users_userId"
	}),
}));

export const questionConversationMessagesRelations = relations(questionConversationMessages, ({one}) => ({
	attempt: one(attempts, {
		fields: [questionConversationMessages.attemptId],
		references: [attempts.attemptId]
	}),
	moduleQuestion: one(moduleQuestions, {
		fields: [questionConversationMessages.questionId],
		references: [moduleQuestions.questionId]
	}),
}));

export const moduleQuestionsRelations = relations(moduleQuestions, ({one, many}) => ({
	questionConversationMessages: many(questionConversationMessages),
	module: one(modules, {
		fields: [moduleQuestions.moduleId],
		references: [modules.moduleId]
	}),
	moduleGenerationRun: one(moduleGenerationRuns, {
		fields: [moduleQuestions.sourceRunId],
		references: [moduleGenerationRuns.runId]
	}),
}));

export const modulesRelations = relations(modules, ({one, many}) => ({
	attempts: many(attempts),
	investigationActions: many(investigationActions),
	submissionSettings: many(submissionSettings),
	assignmentWorkspaceStates: many(assignmentWorkspaceState),
	user: one(users, {
		fields: [modules.createdBy],
		references: [users.userId]
	}),
	organization: one(organizations, {
		fields: [modules.organizationId],
		references: [organizations.organizationId]
	}),
	assignments: many(assignments),
	moduleQuestions: many(moduleQuestions),
}));

export const organizationsRelations = relations(organizations, ({many}) => ({
	attempts: many(attempts),
	moduleGenerationRuns: many(moduleGenerationRuns),
	assignmentWorkspaceStates: many(assignmentWorkspaceState),
	modules: many(modules),
	users: many(users),
	assignments: many(assignments),
}));

export const moduleGenerationRunsRelations = relations(moduleGenerationRuns, ({one, many}) => ({
	user: one(users, {
		fields: [moduleGenerationRuns.createdBy],
		references: [users.userId]
	}),
	organization: one(organizations, {
		fields: [moduleGenerationRuns.organizationId],
		references: [organizations.organizationId]
	}),
	moduleQuestions: many(moduleQuestions),
	moduleGenerationQuestions: many(moduleGenerationQuestions),
}));

export const investigationActionsRelations = relations(investigationActions, ({one}) => ({
	module: one(modules, {
		fields: [investigationActions.moduleId],
		references: [modules.moduleId]
	}),
}));

export const submissionSettingsRelations = relations(submissionSettings, ({one}) => ({
	module: one(modules, {
		fields: [submissionSettings.moduleId],
		references: [modules.id]
	}),
}));

export const assignmentWorkspaceStateRelations = relations(assignmentWorkspaceState, ({one}) => ({
	assignment: one(assignments, {
		fields: [assignmentWorkspaceState.assignmentId],
		references: [assignments.assignmentId]
	}),
	module: one(modules, {
		fields: [assignmentWorkspaceState.moduleId],
		references: [modules.moduleId]
	}),
	organization: one(organizations, {
		fields: [assignmentWorkspaceState.organizationId],
		references: [organizations.organizationId]
	}),
	user: one(users, {
		fields: [assignmentWorkspaceState.userId],
		references: [users.userId]
	}),
}));

export const assignmentsRelations = relations(assignments, ({one, many}) => ({
	assignmentWorkspaceStates: many(assignmentWorkspaceState),
	user_assignedBy: one(users, {
		fields: [assignments.assignedBy],
		references: [users.userId],
		relationName: "assignments_assignedBy_users_userId"
	}),
	user_learnerId: one(users, {
		fields: [assignments.learnerId],
		references: [users.userId],
		relationName: "assignments_learnerId_users_userId"
	}),
	module: one(modules, {
		fields: [assignments.moduleId],
		references: [modules.moduleId]
	}),
	organization: one(organizations, {
		fields: [assignments.organizationId],
		references: [organizations.organizationId]
	}),
}));

export const submissionScoresRelations = relations(submissionScores, ({one}) => ({
	attempt: one(attempts, {
		fields: [submissionScores.attemptId],
		references: [attempts.attemptId]
	}),
}));

export const actionLogsRelations = relations(actionLogs, ({one}) => ({
	attempt: one(attempts, {
		fields: [actionLogs.attemptId],
		references: [attempts.attemptId]
	}),
}));

export const moduleGenerationQuestionsRelations = relations(moduleGenerationQuestions, ({one}) => ({
	moduleGenerationRun: one(moduleGenerationRuns, {
		fields: [moduleGenerationQuestions.runId],
		references: [moduleGenerationRuns.runId]
	}),
}));