import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";

export const profileRouter = Router();

const profileSchema = z.strictObject({
  phone: z.string().trim().max(20).nullable().optional(),
  location: z.string().trim().max(150).nullable().optional(),
  headline: z.string().trim().max(150).nullable().optional(),
  bio: z.string().trim().max(1000).nullable().optional(),
  education: z.string().trim().max(500).nullable().optional(),
  experience: z.string().trim().max(1000).nullable().optional(),
  skills: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
});

profileRouter.get("/", requireAuth, async (_request, response) => {
  const userId = response.locals.auth.user.id;

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId },
  });

  response.status(200).json({
    success: true,
    message: "Profile retrieved successfully.",
    data: { profile },
  });
});

profileRouter.patch("/", requireAuth, async (request, response) => {
  const result = profileSchema.safeParse(request.body);

  if (!result.success) {
    response.status(400).json({
      success: false,
      message: "Please check your profile details.",
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

  const profile = await prisma.candidateProfile.upsert({
    where: {
      userId: response.locals.auth.user.id,
    },
    create: {
      userId: response.locals.auth.user.id,
      ...result.data,
    },
    update: result.data,
  });

  response.status(200).json({
    success: true,
    message: "Profile saved successfully.",
    data: { profile },
  });
});