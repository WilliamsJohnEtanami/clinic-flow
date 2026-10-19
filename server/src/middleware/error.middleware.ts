import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "@/utils/errors";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.path}` } });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    err.type === "entity.parse.failed"
  ) {
    return res.status(400).json({ error: { message: "Invalid JSON request body." } });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      error: {
        message: "Validation failed",
        details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { message: err.message, details: err.details },
    });
  }

  const databaseErrorCode =
    typeof err === "object" && err !== null
      ? "errorCode" in err && typeof err.errorCode === "string"
        ? err.errorCode
        : "code" in err && typeof err.code === "string"
          ? err.code
          : undefined
      : undefined;
  if (databaseErrorCode && ["P1001", "P1002", "P1017", "P2024"].includes(databaseErrorCode)) {
    console.error("Database temporarily unavailable.", { code: databaseErrorCode });
    return res
      .status(503)
      .json({ error: { message: "Database temporarily unavailable. Please try again shortly." } });
  }

  console.error(err);
  res.status(500).json({ error: { message: "Internal server error" } });
}
