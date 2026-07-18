// Database schema — AI Training Simulator
// All 19 tables defined in separate files for maintainability.
//
// To apply schema changes to the dev database:
//   pnpm --filter @workspace/db run push

export * from "./organizations";
export * from "./users";
export * from "./modules";
export * from "./assignments";
export * from "./attempts";
export * from "./submissions";
export * from "./progress";
export * from "./generation";
export * from "./conversations";
