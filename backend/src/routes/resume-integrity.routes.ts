import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { analyzeResumeIntegrity } from "../lib/resume-integrity.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";

export const resumeIntegrityRouter = Router();

resumeIntegrityRouter.use(requireAuth, requireRole("CANDIDATE"));

resumeIntegrityRouter.use((_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});

// GET /api/integrity/:resumeId
resumeIntegrityRouter.get("/:resumeId", async (request, response) => {
  const parsed = z.uuid().safeParse(request.params.resumeId);

  if (!parsed.success) {
    response.status(400).json({
      success: false,
      message: "Invalid resume ID.",
      errors: [],
    });
    return;
  }

  const resume = await prisma.resume.findFirst({
    where: {
      id: parsed.data,
      userId: response.locals.auth.user.id,
    },
    select: {
      id: true,
      originalName: true,
      extractedText: true,
      ocrText: true,
      parseStatus: true,
      ocrStatus: true,
      pageCount: true,
      ocrPageCount: true,
      ocrConfidence: true,
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

  response.json({
    success: true,
    message: "Integrity comparison completed.",
    data: {
      resumeId: resume.id,
      originalName: resume.originalName,
      report: analyzeResumeIntegrity(resume),
    },
  });
});