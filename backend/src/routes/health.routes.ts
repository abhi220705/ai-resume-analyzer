import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  response.set("Cache-Control", "no-store").json({
    success: true,
    message: "Backend is running",
    data: {
      status: "ok",
      service: "resume-analyzer-api",
    },
  });
});

healthRouter.get("/ready", async (_request, response) => {
  response.set("Cache-Control", "no-store");

  try {
    await prisma.$queryRaw`SELECT 1`;

    response.status(200).json({
      success: true,
      message: "Backend and database are ready",
      data: {
        status: "ready",
        database: "connected",
      },
    });
  } catch {
    response.status(503).json({
      success: false,
      message: "Database is temporarily unavailable",
      errors: [],
    });
  }
});