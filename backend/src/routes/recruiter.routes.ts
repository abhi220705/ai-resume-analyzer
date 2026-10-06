import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";

export const recruiterRouter = Router();

// Every endpoint below requires a logged-in recruiter.
recruiterRouter.use(requireAuth, requireRole("RECRUITER"));

const profileSchema = z.strictObject({
  jobTitle: z.string().trim().max(100).nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
});

// GET /api/recruiter/profile
recruiterRouter.get("/profile", async (_request, response) => {
  const userId = response.locals.auth.user.id;

  const profile = await prisma.recruiterProfile.findUnique({
    where: { userId },
    include: { company: true },
  });

  response.status(200).json({
    success: true,
    message: "Recruiter profile retrieved successfully.",
    data: { profile },
  });
});

// PATCH /api/recruiter/profile
recruiterRouter.patch("/profile", async (request, response) => {
  const result = profileSchema.safeParse(request.body);

  if (!result.success) {
    response.status(400).json({
      success: false,
      message: "Please check your recruiter profile details.",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  if (Object.keys(result.data).length === 0) {
    response.status(400).json({
      success: false,
      message: "At least one profile field is required.",
      errors: [],
    });
    return;
  }

  const userId = response.locals.auth.user.id;

  const profile = await prisma.recruiterProfile.upsert({
    where: { userId },
    create: {
      userId,
      ...result.data,
    },
    update: result.data,
    include: { company: true },
  });

  response.status(200).json({
    success: true,
    message: "Recruiter profile saved successfully.",
    data: { profile },
  });
});