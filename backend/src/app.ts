import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";

export function createApp(frontendOrigin: string) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: frontendOrigin }));

  app.get("/api/health", (_request, response) => {
    response.set("Cache-Control", "no-store").json({
      success: true,
      message: "Backend is running",
      data: { status: "ok", service: "resume-analyzer-api" },
    });
  });

  app.use((_request, response) => {
    response.status(404).json({ success: false, message: "Route not found", errors: [] });
  });

  const errorHandler: ErrorRequestHandler = (_error, _request, response, _next) => {
    response.status(500).json({ success: false, message: "Internal server error", errors: [] });
  };
  app.use(errorHandler);
  return app;
}
