import { type Request, type Response } from "express";

/**
 * 404 fallback middleware.
 * Register after all routes, before errorHandler.
 */
export function notFound(req: Request, res: Response): void {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` });
}
