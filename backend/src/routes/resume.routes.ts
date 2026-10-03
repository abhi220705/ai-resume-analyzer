import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { prisma } from "../lib/prisma.js";
import {
  saveResumeFile,
  removeResumeFile,
} from "../lib/resume-storage.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";
import { receiveResume } from "../middleware/resume-upload.js";

export const resumeRouter = Router();

const resumeSelect = {
  id: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
  updatedAt: true,
} as const;

resumeRouter.use((_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});

// Check identity and role before accepting any uploaded bytes.
resumeRouter.use(requireAuth, requireRole("CANDIDATE"));

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (_request, response) =>
    response.locals.auth.user.id as string,
  message: {
    success: false,
    message: "Too many upload attempts. Try again later.",
    errors: [],
  },
});

// Return the signed-in candidate's latest 50 resumes.
resumeRouter.get("/", async (_request, response) => {
  const userId = response.locals.auth.user.id as string;

  const resumes = await prisma.resume.findMany({
    where: { userId },
    select: resumeSelect,
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: 50,
  });

  response.status(200).json({
    success: true,
    message: "Recent resumes retrieved successfully.",
    data: { resumes },
  });
});

// Validate the upload, save its bytes, then create its database record.
resumeRouter.post(
  "/",
  uploadLimiter,
  receiveResume,
  async (request, response) => {
    const file = request.file;

    if (!file) {
      response.status(400).json({
        success: false,
        message: "Please select a PDF file.",
        errors: [],
      });
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
        // Attempt cleanup if saving the database record fails.
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