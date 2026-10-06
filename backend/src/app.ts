import { resumeOcrRouter } from "./routes/resume-ocr.routes.js";
import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { healthRouter } from "./routes/health.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { profileRouter } from "./routes/profile.routes.js";
import { resumeRouter } from "./routes/resume.routes.js";
import { recruiterRouter } from "./routes/recruiter.routes.js";
import { companyRouter } from "./routes/company.routes.js";
import { jobRouter } from "./routes/job.routes.js";
import { matchRouter } from "./routes/match.routes.js";
import { applicationRouter } from "./routes/application.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { resumeIntegrityRouter } from "./routes/resume-integrity.routes.js";

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

  app.use("/api/jobs", express.json({ limit: "64kb" }));
  app.use("/api/applications", express.json({ limit: "32kb" }));
  app.use(express.json({ limit: "10kb" }));
  app.use(cookieParser());

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/resumes", resumeRouter);
  app.use("/api/resumes", resumeOcrRouter);
  app.use("/api/recruiter", recruiterRouter);
  app.use("/api/company", companyRouter);
  app.use("/api/jobs", jobRouter);
  app.use("/api/matches", matchRouter);
  app.use("/api/applications", applicationRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/integrity", resumeIntegrityRouter);

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