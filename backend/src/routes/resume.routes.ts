import { randomUUID } from "node:crypto";
import { Router, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { prisma } from "../lib/prisma.js";
import {
  saveResumeFile,
  removeResumeFile,
  readResumeFile,
} from "../lib/resume-storage.js";
import {
  parseResumePdf,
  PdfParserBusyError,
  type ResumeTextResult,
} from "../lib/resume-parser.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";
import { receiveResume } from "../middleware/resume-upload.js";

export const resumeRouter = Router();

const resumeSelect = {
  id: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  parseStatus: true,
  pageCount: true,
  parseError: true,
  parsedAt: true,
  parseStartedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const resumeDetailSelect = {
  ...resumeSelect,
  extractedText: true,
} as const;

function sendError(
  response: Response,
  status: number,
  message: string,
) {
  response.status(status).json({
    success: false,
    message,
    errors: [],
  });
}

resumeRouter.use((_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});

resumeRouter.use(requireAuth, requireRole("CANDIDATE"));

resumeRouter.param(
  "resumeId",
  (_request, response, next, value: string) => {
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(value)) {
      sendError(response, 400, "Invalid resume ID.");
      return;
    }

    next();
  },
);

function createLimiter(limit: number, message: string) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (_request, response) =>
      response.locals.auth.user.id as string,
    message: {
      success: false,
      message,
      errors: [],
    },
  });
}

const uploadLimiter = createLimiter(
  10,
  "Too many upload attempts. Try again later.",
);

const parseLimiter = createLimiter(
  20,
  "Too many extraction attempts. Try again later.",
);

// List metadata without loading every resume's extracted text.
resumeRouter.get("/", async (_request, response) => {
  const userId = response.locals.auth.user.id as string;

  const resumes = await prisma.resume.findMany({
    where: { userId },
    select: resumeSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
  });

  response.status(200).json({
    success: true,
    message: "Recent resumes retrieved successfully.",
    data: { resumes },
  });
});

// Retrieve one resume, including its saved extracted text.
resumeRouter.get("/:resumeId", async (request, response) => {
  const userId = response.locals.auth.user.id as string;
  const resumeId = request.params.resumeId as string;

  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, userId },
    select: resumeDetailSelect,
  });

  if (!resume) {
    sendError(response, 404, "Resume not found.");
    return;
  }

  response.status(200).json({
    success: true,
    message: "Resume retrieved successfully.",
    data: { resume },
  });
});

// Upload a PDF and create its database record.
resumeRouter.post(
  "/",
  uploadLimiter,
  receiveResume,
  async (request, response) => {
    const file = request.file;

    if (!file) {
      sendError(response, 400, "Please select a PDF file.");
      return;
    }

    const userId = response.locals.auth.user.id as string;
    const storageKey = await saveResumeFile(file.buffer);

    const resume = await prisma.resume
      .create({
        data: {
          userId,
          originalName: file.originalname,
          storageKey,
          mimeType: "application/pdf",
          sizeBytes: file.size,
        },
        select: resumeSelect,
      })
      .catch(async (error: unknown) => {
        await removeResumeFile(storageKey).catch(() => {
          console.error(
            "Could not clean up a resume after a database error.",
          );
        });

        throw error;
      });

    response.status(201).json({
      success: true,
      message: "Resume uploaded successfully.",
      data: { resume },
    });
  },
);

// Extract text from a resume owned by the signed-in candidate.
resumeRouter.post(
  "/:resumeId/parse",
  parseLimiter,
  async (request, response) => {
    const userId = response.locals.auth.user.id as string;
    const resumeId = request.params.resumeId as string;

    const stored = await prisma.resume.findFirst({
      where: { id: resumeId, userId },
      select: {
        ...resumeDetailSelect,
        storageKey: true,
      },
    });

    if (!stored) {
      sendError(response, 404, "Resume not found.");
      return;
    }

    // Keep the private storage key out of API responses.
    const { storageKey, ...publicResume } = stored;

    if (stored.parseStatus === "COMPLETED") {
      response.status(200).json({
        success: true,
        message: "Previously extracted text retrieved successfully.",
        data: { resume: publicResume },
      });
      return;
    }

    const attemptId = randomUUID();
    const startedAt = new Date();
    const staleBefore = new Date(startedAt.getTime() - 60_000);

    // Claim this attempt atomically. Interrupted attempts can be retried.
    const claimed = await prisma.resume.updateMany({
      where: {
        id: resumeId,
        userId,
        OR: [
          {
            parseStatus: {
              in: ["PENDING", "FAILED", "NO_TEXT"],
            },
          },
          {
            parseStatus: "PROCESSING",
            OR: [
              { parseStartedAt: { lt: staleBefore } },
              { parseStartedAt: null },
            ],
          },
        ],
      },
      data: {
        parseStatus: "PROCESSING",
        parseAttemptId: attemptId,
        parseStartedAt: startedAt,
        extractedText: null,
        pageCount: null,
        parseError: null,
        parsedAt: null,
      },
    });

    if (claimed.count !== 1) {
      sendError(
        response,
        409,
        "Parsing is already running or the resume changed. Refresh and try again.",
      );
      return;
    }

    let result: ResumeTextResult;
    let httpStatus = 200;

    try {
      const bytes = await readResumeFile(storageKey, stored.sizeBytes);
      result = await parseResumePdf(bytes);

      if (result.status === "FAILED") {
        httpStatus = 422;
      }
    } catch (error) {
      if (error instanceof PdfParserBusyError) {
        httpStatus = 503;
        result = {
          status: "FAILED",
          error: error.message,
        };
      } else {
        httpStatus = 500;
        result = {
          status: "FAILED",
          error:
            "The stored PDF could not be read. Please try again or upload another copy.",
        };
      }
    }

    // Save only if this is still the active attempt.
    const [resume] = await prisma.resume.updateManyAndReturn({
      where: {
        id: resumeId,
        userId,
        parseStatus: "PROCESSING",
        parseAttemptId: attemptId,
      },
      data: {
        parseStatus: result.status,
        extractedText: result.status === "FAILED" ? null : result.text,
        pageCount: result.status === "FAILED" ? null : result.pageCount,
        parseError: result.status === "FAILED" ? result.error : null,
        parsedAt: result.status === "FAILED" ? null : new Date(),
        parseStartedAt: null,
        parseAttemptId: null,
      },
      select: resumeDetailSelect,
    });

    if (!resume) {
      sendError(
        response,
        409,
        "A newer parsing attempt replaced this one. Refresh the resume.",
      );
      return;
    }

    if (httpStatus === 503) {
      response.set("Retry-After", "5");
    }

    if (result.status === "FAILED") {
      response.status(httpStatus).json({
        success: false,
        message: result.error,
        errors: [],
        data: { resume },
      });
      return;
    }

    response.status(200).json({
      success: true,
      message:
        result.status === "NO_TEXT"
          ? "No embedded text was found. This PDF may require OCR."
          : "Resume text extracted successfully.",
      data: { resume },
    });
  },
);