import { resumeRouter } from "./routes/resume.routes.js";
import { profileRouter } from "./routes/profile.routes.js";
import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { healthRouter } from "./routes/health.routes.js";
import { authRouter } from "./routes/auth.routes.js";

export function createApp(frontendOrigin: string) {
  const app = express();

  app.disable("x-powered-by");

  app.use(helmet());

  app.use(
    cors({
      origin: frontendOrigin,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "10kb" }));
  app.use(cookieParser());

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/resumes", resumeRouter);

  app.use((_request, response) => {
    response.status(404).json({
      success: false,
      message: "Route not found",
      errors: [],
    });
  });

  const errorHandler: ErrorRequestHandler = (
    error,
    _request,
    response,
    next,
  ) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    if (error instanceof Error && "type" in error) {
      if (error.type === "entity.parse.failed") {
        response.status(400).json({
          success: false,
          message: "Request body must contain valid JSON.",
          errors: [],
        });
        return;
      }

      if (error.type === "entity.too.large") {
        response.status(413).json({
          success: false,
          message: "Request body is too large.",
          errors: [],
        });
        return;
      }
    }

    console.error(
      "Unhandled request error:",
      error instanceof Error ? error.name : "UnknownError",
    );

    response.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [],
    });
  };

  app.use(errorHandler);

  return app;
}