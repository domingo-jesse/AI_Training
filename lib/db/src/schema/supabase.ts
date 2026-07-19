import { pgTable, index, foreignKey, bigint, doublePrecision, text, timestamp, integer, unique, serial, numeric, boolean, jsonb, check, uuid, uniqueIndex, date, pgView } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const submissionRegradeHistory = pgTable("submission_regrade_history", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	regradeId: bigint("regrade_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "submission_regrade_history_regrade_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	attemptId: bigint("attempt_id", { mode: "number" }).notNull(),
	oldTotalScore: doublePrecision("old_total_score"),
	newTotalScore: doublePrecision("new_total_score"),
	oldCategoryScoresJson: text("old_category_scores_json"),
	newCategoryScoresJson: text("new_category_scores_json"),
	reason: text(),
	changedByType: text("changed_by_type").default('admin').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	changedByUserId: bigint("changed_by_user_id", { mode: "number" }),
	changedAt: timestamp("changed_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_submission_regrade_history_attempt_id").using("btree", table.attemptId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.attemptId],
			foreignColumns: [attempts.attemptId],
			name: "submission_regrade_history_attempt_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.changedByUserId],
			foreignColumns: [users.userId],
			name: "submission_regrade_history_changed_by_user_id_fkey"
		}),
]);

export const questionConversationMessages = pgTable("question_conversation_messages", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "question_conversation_messages_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	attemptId: bigint("attempt_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	questionId: bigint("question_id", { mode: "number" }).notNull(),
	messageRole: text("message_role").notNull(),
	messageContent: text("message_content").notNull(),
	messageOrder: integer("message_order").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_question_conversation_messages_attempt_id").using("btree", table.attemptId.asc().nullsLast().op("int8_ops")),
	index("idx_question_conversation_messages_attempt_question").using("btree", table.attemptId.asc().nullsLast().op("int8_ops"), table.questionId.asc().nullsLast().op("int8_ops")),
	index("idx_question_conversation_messages_question_id").using("btree", table.questionId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.attemptId],
			foreignColumns: [attempts.attemptId],
			name: "question_conversation_messages_attempt_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.questionId],
			foreignColumns: [moduleQuestions.questionId],
			name: "question_conversation_messages_question_id_fkey"
		}).onDelete("cascade"),
]);

export const submissionQuestionScores = pgTable("submission_question_scores", {
	id: serial().primaryKey().notNull(),
	attemptId: integer("attempt_id").notNull(),
	questionId: integer("question_id").notNull(),
	aiScore: numeric("ai_score"),
	adminScore: numeric("admin_score"),
	finalScore: numeric("final_score"),
	feedback: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	learnerAnswer: text("learner_answer"),
	aiAwardedPoints: numeric("ai_awarded_points"),
	aiMaxPoints: integer("ai_max_points"),
	aiFeedback: text("ai_feedback"),
	aiReasoning: text("ai_reasoning"),
	adminAwardedPoints: numeric("admin_awarded_points"),
	adminFeedback: text("admin_feedback"),
	adminReasoning: text("admin_reasoning"),
	finalAwardedPoints: numeric("final_awarded_points"),
	finalFeedback: text("final_feedback"),
	finalReasoning: text("final_reasoning"),
	visibleToLearner: boolean("visible_to_learner").default(false),
	missingKeyConcepts: text("missing_key_concepts"),
	isAdminOverride: boolean("is_admin_override").default(false).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	scoringMethod: text("scoring_method").default('manual'),
	scoreBreakdownJson: jsonb("score_breakdown_json"),
	conversationTranscript: jsonb("conversation_transcript"),
}, (table) => [
	index("idx_sqs_attempt_id").using("btree", table.attemptId.asc().nullsLast().op("int4_ops")),
	index("idx_sqs_question_id").using("btree", table.questionId.asc().nullsLast().op("int4_ops")),
	unique("submission_question_scores_attempt_id_question_id_key").on(table.attemptId, table.questionId),
]);

export const learnerProfiles = pgTable("learner_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	fullName: text("full_name").notNull(),
	team: text(),
	status: text().default('active').notNull(),
	lastActivity: timestamp("last_activity", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	organizationId: integer("organization_id"),
}, (table) => [
	index("idx_learner_profiles_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_learner_profiles_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	unique("learner_profiles_user_id_key").on(table.userId),
	check("learner_profiles_status_check", sql`status = ANY (ARRAY['active'::text, 'inactive'::text, 'on_leave'::text])`),
]);

export const attempts = pgTable("attempts", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	attemptId: bigint("attempt_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "attempts_attempt_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	userId: bigint("user_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	moduleId: bigint("module_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organizationId: bigint("organization_id", { mode: "number" }),
	diagnosisAnswer: text("diagnosis_answer"),
	nextStepsAnswer: text("next_steps_answer"),
	customerResponse: text("customer_response"),
	escalationChoice: text("escalation_choice"),
	notes: text(),
	understandingScore: doublePrecision("understanding_score"),
	investigationScore: doublePrecision("investigation_score"),
	solutionScore: doublePrecision("solution_score"),
	communicationScore: doublePrecision("communication_score"),
	totalScore: doublePrecision("total_score"),
	aiFeedback: text("ai_feedback"),
	strengths: text(),
	missedPoints: text("missed_points"),
	bestPracticeReasoning: text("best_practice_reasoning"),
	recommendedResponse: text("recommended_response"),
	takeawaySummary: text("takeaway_summary"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }),
	elapsedSeconds: integer("elapsed_seconds"),
	attemptState: text("attempt_state").default('submitted'),
	gradedByType: text("graded_by_type"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	gradedByUserId: bigint("graded_by_user_id", { mode: "number" }),
	gradedAt: timestamp("graded_at", { withTimezone: true, mode: 'string' }),
	timeLimitSeconds: integer("time_limit_seconds"),
	timeRemainingSeconds: integer("time_remaining_seconds"),
	timedOut: boolean("timed_out").default(false),
	questionResponses: text("question_responses"),
	resultStatus: text("result_status").default('pending_review'),
	resultApprovedAt: timestamp("result_approved_at", { mode: 'string' }),
	resultApprovedByUserId: integer("result_approved_by_user_id"),
}, (table) => [
	foreignKey({
			columns: [table.moduleId],
			foreignColumns: [modules.moduleId],
			name: "attempts_module_id_fkey"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.organizationId],
			name: "attempts_organization_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.userId],
			name: "attempts_user_id_fkey"
		}),
]);

export const moduleGenerationRuns = pgTable("module_generation_runs", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	runId: bigint("run_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "module_generation_runs_run_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organizationId: bigint("organization_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdBy: bigint("created_by", { mode: "number" }),
	inputTitle: text("input_title"),
	inputCategory: text("input_category"),
	inputDifficulty: text("input_difficulty"),
	inputDescription: text("input_description"),
	roleFocus: text("role_focus"),
	testFocus: text("test_focus"),
	learningObjectives: text("learning_objectives"),
	inputContentSections: text("input_content_sections"),
	scenarioConstraints: text("scenario_constraints"),
	completionRequirements: text("completion_requirements"),
	inputQuizRequired: boolean("input_quiz_required").default(false),
	requestedQuestionCount: integer("requested_question_count").default(5),
	generatedTitle: text("generated_title"),
	generatedDescription: text("generated_description"),
	generatedScenarioOverview: text("generated_scenario_overview"),
	generationStatus: text("generation_status").default('draft'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	inputEstimatedMinutes: integer("input_estimated_minutes"),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.userId],
			name: "module_generation_runs_created_by_fkey"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.organizationId],
			name: "module_generation_runs_organization_id_fkey"
		}),
]);

export const investigationActions = pgTable("investigation_actions", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	actionId: bigint("action_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "investigation_actions_action_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	moduleId: bigint("module_id", { mode: "number" }).notNull(),
	actionName: text("action_name").notNull(),
	revealedInformation: text("revealed_information").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.moduleId],
			foreignColumns: [modules.moduleId],
			name: "investigation_actions_module_id_fkey"
		}),
]);

export const organizations = pgTable("organizations", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organizationId: bigint("organization_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "organizations_organization_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	name: text().notNull(),
}, (table) => [
	unique("organizations_name_key").on(table.name),
]);

export const moduleProgress = pgTable("module_progress", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	moduleId: uuid("module_id").notNull(),
	progressPercent: integer("progress_percent").default(0).notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	lastActivityAt: timestamp("last_activity_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	organizationId: integer("organization_id"),
}, (table) => [
	index("idx_module_progress_completed_at").using("btree", table.completedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_module_progress_module_id").using("btree", table.moduleId.asc().nullsLast().op("uuid_ops")),
	index("idx_module_progress_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	unique("module_progress_user_id_module_id_key").on(table.userId, table.moduleId),
	check("module_progress_progress_percent_check", sql`(progress_percent >= 0) AND (progress_percent <= 100)`),
]);

export const moduleAssignments = pgTable("module_assignments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	moduleId: uuid("module_id").notNull(),
	assignedAt: timestamp("assigned_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	assignedBy: uuid("assigned_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	organizationId: integer("organization_id"),
}, (table) => [
	index("idx_module_assignments_module_id").using("btree", table.moduleId.asc().nullsLast().op("uuid_ops")),
	index("idx_module_assignments_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	unique("module_assignments_user_id_module_id_key").on(table.userId, table.moduleId),
]);

export const submissionSettings = pgTable("submission_settings", {
	id: serial().primaryKey().notNull(),
	moduleId: text("module_id").notNull(),
	showScoreToLearner: boolean("show_score_to_learner").default(false),
	showFeedbackToLearner: boolean("show_feedback_to_learner").default(false),
	showCorrectAnswers: boolean("show_correct_answers").default(false),
	showLearnerResponsesToLearner: boolean("show_learner_responses_to_learner").default(true),
	requireAdminApproval: boolean("require_admin_approval").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	resultsVisibilityJson: jsonb("results_visibility_json").default({}),
}, (table) => [
	foreignKey({
			columns: [table.moduleId],
			foreignColumns: [modules.id],
			name: "fk_submission_settings_module"
		}).onDelete("cascade"),
	unique("submission_settings_module_id_key").on(table.moduleId),
]);

export const assignmentWorkspaceState = pgTable("assignment_workspace_state", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	assignmentId: bigint("assignment_id", { mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organizationId: bigint("organization_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	moduleId: bigint("module_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	userId: bigint("user_id", { mode: "number" }).notNull(),
	currentStep: integer("current_step").default(1),
	progressStatus: text("progress_status").default('not_started'),
	learnerNotes: text("learner_notes"),
	diagnosisResponse: text("diagnosis_response"),
	nextStepsResponse: text("next_steps_response"),
	customerResponse: text("customer_response"),
	escalationChoice: text("escalation_choice"),
	questionResponses: text("question_responses").default('{}'),
	revealedActions: text("revealed_actions").default('{}'),
	usedActions: text("used_actions").default('[]'),
	submittedState: integer("submitted_state").default(0),
	startedAt: text("started_at"),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }),
	lastSavedAt: timestamp("last_saved_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	timeLimitMinutes: integer("time_limit_minutes"),
	endTime: text("end_time"),
	autoSubmittedState: integer("auto_submitted_state").default(0),
}, (table) => [
	foreignKey({
			columns: [table.assignmentId],
			foreignColumns: [assignments.assignmentId],
			name: "assignment_workspace_state_assignment_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.moduleId],
			foreignColumns: [modules.moduleId],
			name: "assignment_workspace_state_module_id_fkey"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.organizationId],
			name: "assignment_workspace_state_organization_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.userId],
			name: "assignment_workspace_state_user_id_fkey"
		}),
]);

export const modules = pgTable("modules", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	moduleId: bigint("module_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "modules_module_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	id: text(),
	title: text().notNull(),
	category: text().notNull(),
	difficulty: text().notNull(),
	description: text(),
	estimatedTime: text("estimated_time"),
	scenarioTicket: text("scenario_ticket"),
	scenarioContext: text("scenario_context"),
	hiddenRootCause: text("hidden_root_cause"),
	expectedReasoningPath: text("expected_reasoning_path"),
	expectedDiagnosis: text("expected_diagnosis"),
	expectedNextSteps: text("expected_next_steps"),
	expectedCustomerResponse: text("expected_customer_response"),
	lessonTakeaway: text("lesson_takeaway"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organizationId: bigint("organization_id", { mode: "number" }),
	status: text().default('published'),
	learningObjectives: text("learning_objectives"),
	contentSections: text("content_sections"),
	completionRequirements: text("completion_requirements"),
	quizRequired: boolean("quiz_required").default(false),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdBy: bigint("created_by", { mode: "number" }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	scoringStyle: text("scoring_style").default('manual'),
	llmScoringEnabled: boolean("llm_scoring_enabled").default(false),
	llmGraderInstructions: text("llm_grader_instructions"),
	learnerFeedbackVisibility: text("learner_feedback_visibility").default('admin_approved_only'),
	scoringConfigJson: text("scoring_config_json"),
}, (table) => [
	uniqueIndex("idx_modules_external_id").using("btree", table.id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.userId],
			name: "modules_created_by_fkey"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.organizationId],
			name: "modules_organization_id_fkey"
		}),
	unique("modules_id_key").on(table.id),
]);

export const users = pgTable("users", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	userId: bigint("user_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "users_user_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	id: text(),
	name: text().notNull(),
	email: text(),
	googleSubject: text("google_subject"),
	role: text().notNull(),
	team: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organizationId: bigint("organization_id", { mode: "number" }),
	isActive: boolean("is_active").default(true),
	username: text(),
	passwordHash: text("password_hash"),
	authProvider: text("auth_provider").default('local_password'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	emailNotificationsEnabled: boolean("email_notifications_enabled").default(true),
}, (table) => [
	uniqueIndex("idx_users_external_id").using("btree", table.id.asc().nullsLast().op("text_ops")),
	uniqueIndex("idx_users_username").using("btree", table.username.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.organizationId],
			name: "users_organization_id_fkey"
		}),
	unique("users_id_key").on(table.id),
	unique("users_username_key").on(table.username),
]);

export const moduleRubricCriteria = pgTable("module_rubric_criteria", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "module_rubric_criteria_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	moduleId: bigint("module_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	questionId: bigint("question_id", { mode: "number" }).notNull(),
	criterionOrder: integer("criterion_order").default(1).notNull(),
	label: text().notNull(),
	description: text().default(''),
	maxScore: numeric("max_score").default('1.0'),
	weight: numeric().default('1.0'),
	feedback: text().default(''),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	maxPoints: numeric("max_points").default('1.0'),
	gradingGuidance: text("grading_guidance").default(''),
}, (table) => [
	index("idx_module_rubric_criteria_module_id").using("btree", table.moduleId.asc().nullsLast().op("int8_ops")),
	index("idx_module_rubric_criteria_module_question").using("btree", table.moduleId.asc().nullsLast().op("int8_ops"), table.questionId.asc().nullsLast().op("int8_ops")),
	index("idx_module_rubric_criteria_question_id").using("btree", table.questionId.asc().nullsLast().op("int8_ops")),
]);

export const assignments = pgTable("assignments", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	assignmentId: bigint("assignment_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "assignments_assignment_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organizationId: bigint("organization_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	moduleId: bigint("module_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	learnerId: bigint("learner_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	assignedBy: bigint("assigned_by", { mode: "number" }),
	dueDate: date("due_date"),
	assignedAt: timestamp("assigned_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	isActive: boolean("is_active").default(true),
}, (table) => [
	foreignKey({
			columns: [table.assignedBy],
			foreignColumns: [users.userId],
			name: "assignments_assigned_by_fkey"
		}),
	foreignKey({
			columns: [table.learnerId],
			foreignColumns: [users.userId],
			name: "assignments_learner_id_fkey"
		}),
	foreignKey({
			columns: [table.moduleId],
			foreignColumns: [modules.moduleId],
			name: "assignments_module_id_fkey"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.organizationId],
			name: "assignments_organization_id_fkey"
		}),
]);

export const submissionScores = pgTable("submission_scores", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	submissionScoreId: bigint("submission_score_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "submission_scores_submission_score_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	attemptId: bigint("attempt_id", { mode: "number" }).notNull(),
	scoringVersion: text("scoring_version").default('heuristic_v1').notNull(),
	understandingScore: doublePrecision("understanding_score"),
	investigationScore: doublePrecision("investigation_score"),
	solutionScore: doublePrecision("solution_score").default(0).notNull(),
	communicationScore: doublePrecision("communication_score"),
	understandingRationale: text("understanding_rationale"),
	investigationRationale: text("investigation_rationale"),
	solutionRationale: text("solution_rationale"),
	communicationRationale: text("communication_rationale"),
	totalScore: doublePrecision("total_score").default(0).notNull(),
	scoringProvider: text("scoring_provider"),
	scoringModelName: text("scoring_model_name"),
	scoringPromptTemplateId: text("scoring_prompt_template_id"),
	scoringTemperature: doublePrecision("scoring_temperature"),
	scoringConfigJson: text("scoring_config_json"),
	scoredAt: timestamp("scored_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	scoreInputsJson: text("score_inputs_json"),
	aiTotalScore: numeric("ai_total_score"),
	adminTotalScore: numeric("admin_total_score"),
	finalTotalScore: numeric("final_total_score"),
	scoreStatus: text("score_status").default('pending'),
	gradingStatus: text("grading_status").default('pending'),
	maxTotalScore: numeric("max_total_score"),
	percentage: numeric().default('0'),
	overallAiFeedback: text("overall_ai_feedback"),
	learnerFeedback: text("learner_feedback"),
	learnerVisibleFeedback: text("learner_visible_feedback"),
	approvedBy: integer("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	bestPracticeReasoning: text("best_practice_reasoning"),
	recommendedResponse: text("recommended_response"),
	lessonTakeaway: text("lesson_takeaway"),
	learnerStrengths: text("learner_strengths"),
	learnerWeaknesses: text("learner_weaknesses"),
	learnerMissedPoints: text("learner_missed_points"),
	overallAdminFeedback: text("overall_admin_feedback"),
	reviewStatus: text("review_status").default('submitted'),
	scoringMethod: text("scoring_method").default('keyword'),
	scoringBreakdownJson: text("scoring_breakdown_json"),
	aiReasoningJson: text("ai_reasoning_json"),
	gradingError: text("grading_error"),
	showResultsToLearner: boolean("show_results_to_learner").default(false),
	showOverallScoreToLearner: boolean("show_overall_score_to_learner").default(false),
	showQuestionScoresToLearner: boolean("show_question_scores_to_learner").default(false),
	showFeedbackToLearner: boolean("show_feedback_to_learner").default(false),
	showExpectedAnswersToLearner: boolean("show_expected_answers_to_learner").default(false),
	showGradingCriteriaToLearner: boolean("show_grading_criteria_to_learner").default(false),
	showAiEvaluationDetailsToLearner: boolean("show_ai_evaluation_details_to_learner").default(false),
	resultsVisibilityJson: jsonb("results_visibility_json").default({}),
	showAiReviewToLearner: boolean("show_ai_review_to_learner").default(false),
	showLearnerResponsesToLearner: boolean("show_learner_responses_to_learner").default(false),
}, (table) => [
	index("idx_submission_scores_attempt_id").using("btree", table.attemptId.asc().nullsLast().op("int8_ops")),
	index("idx_submission_scores_total_score").using("btree", table.totalScore.asc().nullsLast().op("float8_ops")),
	foreignKey({
			columns: [table.attemptId],
			foreignColumns: [attempts.attemptId],
			name: "submission_scores_attempt_id_fkey"
		}).onDelete("cascade"),
	unique("submission_scores_attempt_id_key").on(table.attemptId),
]);

export const moduleQuestions = pgTable("module_questions", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	questionId: bigint("question_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "module_questions_question_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	moduleId: bigint("module_id", { mode: "number" }).notNull(),
	questionOrder: integer("question_order").notNull(),
	questionText: text("question_text").notNull(),
	rationale: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sourceRunId: bigint("source_run_id", { mode: "number" }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	questionType: text("question_type").default('open_text'),
	optionsText: text("options_text"),
	expectedAnswer: text("expected_answer"),
	rubric: text(),
	maxPoints: integer("max_points").default(10),
	scoringType: text("scoring_type").default('manual'),
	aiConversationPrompt: text("ai_conversation_prompt"),
	aiRoleOrPersona: text("ai_role_or_persona"),
	evaluationFocus: text("evaluation_focus"),
	maxLearnerResponses: integer("max_learner_responses").default(3),
	optionalWrapUpInstruction: text("optional_wrap_up_instruction"),
	scoringStyle: text("scoring_style"),
	keywordExpectedTerms: text("keyword_expected_terms"),
	llmGradingCriteria: text("llm_grading_criteria"),
	llmGradingInstructions: text("llm_grading_instructions"),
	learnerVisibleFeedbackMode: text("learner_visible_feedback_mode").default('admin_approved_only'),
	rubricCriteriaJson: text("rubric_criteria_json"),
	partialCreditGuidance: text("partial_credit_guidance").default(''),
	incorrectCriteria: text("incorrect_criteria").default(''),
	incompleteCriteria: text("incomplete_criteria").default(''),
	strongResponseCriteria: text("strong_response_criteria").default(''),
}, (table) => [
	foreignKey({
			columns: [table.moduleId],
			foreignColumns: [modules.moduleId],
			name: "module_questions_module_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sourceRunId],
			foreignColumns: [moduleGenerationRuns.runId],
			name: "module_questions_source_run_id_fkey"
		}).onDelete("set null"),
	check("question_type_valid", sql`question_type = ANY (ARRAY['open_text'::text, 'multiple_choice'::text, 'free_text'::text, 'ai_conversation'::text])`),
	check("scoring_type_valid", sql`scoring_type = ANY (ARRAY['manual'::text, 'keyword'::text, 'llm'::text])`),
]);

export const actionLogs = pgTable("action_logs", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	logId: bigint("log_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "action_logs_log_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	attemptId: bigint("attempt_id", { mode: "number" }).notNull(),
	actionName: text("action_name").notNull(),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.attemptId],
			foreignColumns: [attempts.attemptId],
			name: "action_logs_attempt_id_fkey"
		}),
]);

export const moduleGenerationQuestions = pgTable("module_generation_questions", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	generatedQuestionId: bigint("generated_question_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "module_generation_questions_generated_question_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	runId: bigint("run_id", { mode: "number" }).notNull(),
	questionOrder: integer("question_order").notNull(),
	questionText: text("question_text").notNull(),
	rationale: text(),
	approvalStatus: text("approval_status").default('pending'),
	adminFeedback: text("admin_feedback"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	questionType: text("question_type").default('open_text'),
	optionsText: text("options_text"),
}, (table) => [
	foreignKey({
			columns: [table.runId],
			foreignColumns: [moduleGenerationRuns.runId],
			name: "module_generation_questions_run_id_fkey"
		}).onDelete("cascade"),
]);
export const organizationMemberships = pgTable("organization_memberships", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organizationId: bigint("organization_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	userId: bigint("user_id", { mode: "number" }).notNull(),
	role: text().notNull(),
	status: text().default('active').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_org_memberships_org_id").using("btree", table.organizationId.asc().nullsLast().op("int8_ops")),
	index("idx_org_memberships_user_id").using("btree", table.userId.asc().nullsLast().op("int8_ops")),
	unique("organization_memberships_org_user_key").on(table.organizationId, table.userId),
	foreignKey({
		columns: [table.organizationId],
		foreignColumns: [organizations.organizationId],
		name: "organization_memberships_organization_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.userId],
		name: "organization_memberships_user_id_fkey"
	}).onDelete("cascade"),
	check("org_membership_role_check", sql`role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'learner'::text])`),
	check("org_membership_status_check", sql`status = ANY (ARRAY['active'::text, 'inactive'::text, 'invited'::text])`),
]);

export const groups = pgTable("groups", {
	groupId: bigint("group_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "groups_group_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	orgId: bigint("org_id", { mode: "number" }).notNull(),
	name: text().notNull(),
	color: text().notNull().default('#6366f1'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_groups_org_id").using("btree", table.orgId.asc().nullsLast().op("int8_ops")),
	foreignKey({
		columns: [table.orgId],
		foreignColumns: [organizations.organizationId],
		name: "groups_org_id_fkey"
	}).onDelete("cascade"),
]);

export const userGroups = pgTable("user_groups", {
	userGroupId: bigint("user_group_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "user_groups_user_group_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	groupId: bigint("group_id", { mode: "number" }).notNull(),
	userId: bigint("user_id", { mode: "number" }).notNull(),
}, (table) => [
	index("idx_user_groups_group_id").using("btree", table.groupId.asc().nullsLast().op("int8_ops")),
	index("idx_user_groups_user_id").using("btree", table.userId.asc().nullsLast().op("int8_ops")),
	foreignKey({
		columns: [table.groupId],
		foreignColumns: [groups.groupId],
		name: "user_groups_group_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.userId],
		name: "user_groups_user_id_fkey"
	}).onDelete("cascade"),
	unique("user_groups_group_id_user_id_key").on(table.groupId, table.userId),
]);

export const orgSettings = pgTable("org_settings", {
	orgId: bigint("org_id", { mode: "number" }).primaryKey(),
	passingScore: integer("passing_score").notNull().default(70),
	allowMultipleAttempts: boolean("allow_multiple_attempts").notNull().default(true),
	maxAttempts: integer("max_attempts").notNull().default(3),
	defaultDifficulty: text("default_difficulty").notNull().default("intermediate"),
	defaultTimeLimit: integer("default_time_limit").notNull().default(0),
	showScoreToLearner: boolean("show_score_to_learner").notNull().default(true),
	showFeedbackToLearner: boolean("show_feedback_to_learner").notNull().default(true),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.orgId],
		foreignColumns: [organizations.organizationId],
		name: "org_settings_org_id_fkey",
	}).onDelete("cascade"),
]);

export const systemLogs = pgTable("system_logs", {
  logId: bigint("log_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  level: text().notNull().default("info"),
  category: text().notNull().default("general"),
  message: text().notNull(),
  metadata: jsonb(),
  orgId: bigint("org_id", { mode: "number" }),
  userId: text("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
});

export const learnerDashboardSummary = pgView("learner_dashboard_summary", {	userId: text("user_id"),
	name: text(),
	team: text(),
	status: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	assignedModules: bigint("assigned_modules", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	completedModules: bigint("completed_modules", { mode: "number" }),
	lastActivity: timestamp("last_activity", { withTimezone: true, mode: 'string' }),
}).as(sql`SELECT u.id AS user_id, lp.full_name AS name, lp.team, lp.status, count(DISTINCT ma.module_id) AS assigned_modules, count(DISTINCT CASE WHEN mp.completed_at IS NOT NULL THEN mp.module_id ELSE NULL::uuid END) AS completed_modules, max(COALESCE(lp.last_activity, mp.last_activity_at)) AS last_activity FROM users u JOIN learner_profiles lp ON lp.user_id = u.id LEFT JOIN module_assignments ma ON ma.user_id = u.id LEFT JOIN module_progress mp ON mp.user_id = u.id GROUP BY u.id, lp.full_name, lp.team, lp.status, lp.last_activity`);