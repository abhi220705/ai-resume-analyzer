import { Router } from "express";
import { z } from "zod";

import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";

export const companyRouter = Router();

companyRouter.use(requireAuth, requireRole("RECRUITER"));

const companySchema = z.strictObject({
  name: z.string().trim().min(2).max(150),
  website: z
    .string()
    .trim()
    .max(500)
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    }, "Enter a complete website URL, such as https://example.com")
    .nullable()
    .optional(),
  industry: z.string().trim().max(100).nullable().optional(),
  location: z.string().trim().max(150).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
});

// GET /api/company
companyRouter.get("/", async (_request, response) => {
  const userId = response.locals.auth.user.id;

  const profile = await prisma.recruiterProfile.findUnique({
    where: { userId },
    select: { company: true },
  });

  response.status(200).json({
    success: true,
    message: "Company retrieved successfully.",
    data: { company: profile?.company ?? null },
  });
});

// POST /api/company
companyRouter.post("/", async (request, response) => {
  const result = companySchema.safeParse(request.body);

  if (!result.success) {
    response.status(400).json({
      success: false,
      message: "Please check your company details.",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  const userId = response.locals.auth.user.id;

  try {
    const company = await prisma.$transaction(
      async (tx) => {
        const profile = await tx.recruiterProfile.findUnique({
          where: { userId },
          select: { companyId: true },
        });

        const ownedCompany = await tx.company.findUnique({
          where: { ownerId: userId },
          select: { id: true },
        });

        if (profile?.companyId || ownedCompany) {
          return null;
        }

        const createdCompany = await tx.company.create({
          data: {
            ...result.data,
            ownerId: userId,
            verificationStatus: "UNVERIFIED",
          },
        });

        await tx.recruiterProfile.upsert({
          where: { userId },
          create: {
            userId,
            companyId: createdCompany.id,
          },
          update: {
            companyId: createdCompany.id,
          },
        });

        return createdCompany;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (!company) {
      response.status(409).json({
        success: false,
        message: "You already own or belong to a company.",
        errors: [],
      });
      return;
    }

    response.status(201).json({
      success: true,
      message: "Company created successfully.",
      data: { company },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      response.status(409).json({
        success: false,
        message:
          "Company details changed during this request. Refresh and try again.",
        errors: [],
      });
      return;
    }

    throw error;
  }
});

// PATCH /api/company
companyRouter.patch("/", async (request, response) => {
  const result = companySchema.partial().safeParse(request.body);

  if (!result.success) {
    response.status(400).json({
      success: false,
      message: "Please check your company details.",
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
      message: "At least one company field is required.",
      errors: [],
    });
    return;
  }

  const userId = response.locals.auth.user.id;

  try {
    const company = await prisma.company.update({
      where: { ownerId: userId },
      data: {
        ...result.data,
        verificationStatus: "UNVERIFIED",
      },
    });

    response.status(200).json({
      success: true,
      message: "Company updated successfully.",
      data: { company },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      response.status(404).json({
        success: false,
        message: "You do not own a company to edit.",
        errors: [],
      });
      return;
    }

    throw error;
  }
});