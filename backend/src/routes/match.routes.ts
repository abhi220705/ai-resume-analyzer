import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { matchResumeToJob } from "../lib/job-matching.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";

export const matchRouter = Router();

matchRouter.use((_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});

matchRouter.use(requireAuth, requireRole("CANDIDATE"));

const matchSchema = z.strictObject({
  resumeId: z.uuid(),
  jobId: z.uuid(),
});

const matchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (_request, response) =>
    response.locals.auth.user.id as string,
  message: {
    success: false,
    message: "Too many matching requests. Try again later.",
    errors: [],
  },
});

// POST /api/matches
matchRouter.post("/", matchLimiter, async (request, response) => {
  const result = matchSchema.safeParse(request.body);

  if (!result.success) {
    response.status(400).json({
      success: false,
      message: "Choose a valid resume and job.",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  const userId = response.locals.auth.user.id as string;
  const { resumeId, jobId } = result.data;

  const [resume, job] = await Promise.all([
    prisma.resume.findFirst({
      where: {
        id: resumeId,
        userId,
      },
      select: {
        id: true,
        originalName: true,
        parseStatus: true,
        extractedText: true,
      },
    }),
    prisma.job.findFirst({
      where: {
        id: jobId,
        status: "PUBLISHED",
      },
      select: {
        id: true,
        title: true,
        requiredSkills: true,
        preferredSkills: true,
        minExperienceYears: true,
        location: true,
        workMode: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  if (!resume || !job) {
    response.status(404).json({
      success: false,
      message: "Resume or published job not found.",
      errors: [],
    });
    return;
  }

  if (
    resume.parseStatus !== "COMPLETED" ||
    !resume.extractedText?.trim()
  ) {
    response.status(409).json({
      success: false,
      message: "Extract readable text from this resume before matching.",
      errors: [],
    });
    return;
  }

  if (resume.extractedText.length > 100_000) {
    response.status(422).json({
      success: false,
      message: "Resume text exceeds the matching limit.",
      errors: [],
    });
    return;
  }

  if (job.requiredSkills.length === 0) {
    response.status(409).json({
      success: false,
      message: "This job does not have required skills configured.",
      errors: [],
    });
    return;
  }

  const match = matchResumeToJob(
    resume.extractedText,
    job.requiredSkills,
    job.preferredSkills,
  );

  response.status(200).json({
    success: true,
    message: "Resume compared with the job successfully.",
    data: {
      resume: {
        id: resume.id,
        originalName: resume.originalName,
      },
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
      },
      match,
      otherRequirements: {
        minExperienceYears: job.minExperienceYears,
        location: job.location,
        workMode: job.workMode,
        assessed: false,
      },
    },
  });
});