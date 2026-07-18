import { type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger";

export interface AppError extends Error {
  statusCode?: number;
}

/**
 * Central error-handling middleware.
 * Must be registered last (after all routes) in app.ts.
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;

  logger.error(
    { err, url: req.url, method: req.method },
    "Unhandled error in request",
  );

  res.status(statusCode).json({
    error: statusCode === 500 ? "Internal Server Error" : err.message,
  });
}
