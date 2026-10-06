import { randomUUID } from "node:crypto";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { readResumeFile } from "../lib/resume-storage.js";
import { runResumeOcr, OcrBusyError } from "../lib/resume-ocr.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";

export const resumeOcrRouter = Router();

resumeOcrRouter.use(requireAuth, requireRole("CANDIDATE"));

resumeOcrRouter.use((_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});

const idSchema = z.string().uuid();

const ocrSelect = {
  id: true,
  originalName: true,
  ocrStatus: true,
  ocrText: true,
  ocrPageCount: true,
  ocrConfidence: true,
  ocrError: true,
  ocrStartedAt: true,
  ocrCompletedAt: true,
} as const;

const ocrLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (_request, response) =>
    response.locals.auth.user.id as string,
  message: {
    success: false,
    message: "Too many OCR attempts. Try again later.",
    errors: [],
  },
});

async function processOcr(
  resumeId: string,
  userId: string,
  storageKey: string,
  sizeBytes: number,
  attemptId: string,
) {
  // Only this attempt may update its result.
  const where = {
    id: resumeId,
    userId,
    ocrStatus: "PROCESSING" as const,
    ocrAttemptId: attemptId,
  };

  try {
    const buffer = await readResumeFile(storageKey, sizeBytes);
    const result = await runResumeOcr(buffer);

    if (result.status === "FAILED") {
      await prisma.resume.updateMany({
        where,
        data: {
          ocrStatus: "FAILED",
          ocrError: result.error,
          ocrStartedAt: null,
          ocrAttemptId: null,
          ocrCompletedAt: new Date(),
        },
      });
      return;
    }

    await prisma.resume.updateMany({
      where,
      data: {
        ocrStatus: result.status,
        ocrText: result.text,
        ocrPageCount: result.pageCount,
        ocrConfidence: result.confidence,
        ocrError: null,
        ocrStartedAt: null,
        ocrAttemptId: null,
        ocrCompletedAt: new Date(),
      },
    });
  } catch (error) {
    const message =
      error instanceof OcrBusyError
        ? error.message
        : "OCR could not finish. Please try again.";

    await prisma.resume.updateMany({
      where,
      data: {
        ocrStatus: "FAILED",
        ocrError: message,
        ocrStartedAt: null,
        ocrAttemptId: null,
        ocrCompletedAt: new Date(),
      },
    });
  }
}

// GET /api/resumes/:resumeId/ocr
resumeOcrRouter.get("/:resumeId/ocr", async (request, response) => {
  const id = idSchema.safeParse(request.params.resumeId);

  if (!id.success) {
    response.status(400).json({
      success: false,
      message: "Invalid resume ID.",
      errors: [],
    });
    return;
  }

  const userId = response.locals.auth.user.id as string;

  const resume = await prisma.resume.findFirst({
    where: { id: id.data, userId },
    select: ocrSelect,
  });

  if (!resume) {
    response.status(404).json({
      success: false,
      message: "Resume not found.",
      errors: [],
    });
    return;
  }

  response.json({
    success: true,
    message: "OCR status retrieved successfully.",
    data: { resume },
  });
});

// POST /api/resumes/:resumeId/ocr
resumeOcrRouter.post(
  "/:resumeId/ocr",
  ocrLimiter,
  async (request, response) => {
    const id = idSchema.safeParse(request.params.resumeId);

    if (!id.success) {
      response.status(400).json({
        success: false,
        message: "Invalid resume ID.",
        errors: [],
      });
      return;
    }

    const userId = response.locals.auth.user.id as string;

    const resume = await prisma.resume.findFirst({
      where: { id: id.data, userId },
      select: {
        id: true,
        storageKey: true,
        sizeBytes: true,
        ocrStatus: true,
      },
    });

    if (!resume) {
      response.status(404).json({
        success: false,
        message: "Resume not found.",
        errors: [],
      });
      return;
    }

    if (resume.ocrStatus === "COMPLETED") {
      response.json({
        success: true,
        message: "OCR is already complete.",
        data: {
          resumeId: resume.id,
          status: "COMPLETED",
        },
      });
      return;
    }

    const attemptId = randomUUID();
    const staleBefore = new Date(Date.now() - 3 * 60 * 1000);

    const claim = await prisma.resume.updateMany({
      where: {
        id: resume.id,
        userId,
        OR: [
          {
            ocrStatus: {
              in: ["PENDING", "FAILED", "NO_TEXT"],
            },
          },
          {
            ocrStatus: "PROCESSING",
            ocrStartedAt: { lt: staleBefore },
          },
          {
            ocrStatus: "PROCESSING",
            ocrStartedAt: null,
          },
        ],
      },
      data: {
        ocrStatus: "PROCESSING",
        ocrAttemptId: attemptId,
        ocrStartedAt: new Date(),
        ocrCompletedAt: null,
        ocrText: null,
        ocrPageCount: null,
        ocrConfidence: null,
        ocrError: null,
      },
    });

    if (claim.count !== 1) {
      response.status(409).json({
        success: false,
        message: "OCR is already running or has just completed. Refresh its status.",
        errors: [],
      });
      return;
    }

    void processOcr(
      resume.id,
      userId,
      resume.storageKey,
      resume.sizeBytes,
      attemptId,
    ).catch(() => {
      // A database outage may also prevent saving the failure state.
      console.error("Could not persist the OCR processing result.");
    });

    response.status(202).json({
      success: true,
      message: "OCR started.",
      data: {
        resumeId: resume.id,
        status: "PROCESSING",
      },
    });
  },
);