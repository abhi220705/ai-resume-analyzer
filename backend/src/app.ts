import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import { healthRouter } from "./routes/health.routes.js";

export function createApp(frontendOrigin: string) {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: frontendOrigin }));

  app.use("/api/health", healthRouter);

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