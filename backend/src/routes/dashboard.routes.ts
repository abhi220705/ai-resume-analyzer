import { Router } from "express";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";

export const dashboardRouter = Router();

dashboardRouter.use((_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});

dashboardRouter.use(requireAuth);

// Candidate overview.
dashboardRouter.get(
  "/candidate",
  requireRole("CANDIDATE"),
  async (_request, response) => {
    const userId = response.locals.auth.user.id as string;

    const [
      totalResumes,
      parsedResumes,
      totalApplications,
      activeApplications,
      recentApplications,
    ] = await prisma.$transaction(
      [
        prisma.resume.count({
          where: { userId },
        }),
        prisma.resume.count({
          where: { userId, parseStatus: "COMPLETED" },
        }),
        prisma.application.count({
          where: { candidateId: userId },
        }),
        prisma.application.count({
          where: {
            candidateId: userId,
            status: { in: ["SUBMITTED", "REVIEWING", "SHORTLISTED"] },
          },
        }),
        prisma.application.findMany({
          where: { candidateId: userId },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 5,
          select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            job: {
              select: {
                id: true,
                title: true,
                company: { select: { name: true } },
              },
            },
          },
        }),
      ],
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      },
    );

    response.json({
      success: true,
      message: "Candidate dashboard retrieved successfully.",
      data: {
        stats: {
          totalResumes,
          parsedResumes,
          totalApplications,
          activeApplications,
        },
        recentApplications,
      },
    });
  },
);

// Recruiter overview: only their jobs within their current company.
dashboardRouter.get(
  "/recruiter",
  requireRole("RECRUITER"),
  async (_request, response) => {
    const userId = response.locals.auth.user.id as string;

    const jobScope: Prisma.JobWhereInput = {
      createdById: userId,
      company: {
        recruiters: { some: { userId } },
      },
    };

    const applicationScope: Prisma.ApplicationWhereInput = {
      job: jobScope,
    };

    const [
      totalJobs,
      publishedJobs,
      totalApplications,
      awaitingReview,
      recentApplications,
    ] = await prisma.$transaction(
      [
        prisma.job.count({
          where: jobScope,
        }),
        prisma.job.count({
          where: { ...jobScope, status: "PUBLISHED" },
        }),
        prisma.application.count({
          where: applicationScope,
        }),
        prisma.application.count({
          where: { ...applicationScope, status: "SUBMITTED" },
        }),
        prisma.application.findMany({
          where: applicationScope,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 5,
          select: {
            id: true,
            status: true,
            createdAt: true,
            candidate: {
              select: { name: true },
            },
            job: {
              select: { id: true, title: true },
            },
          },
        }),
      ],
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      },
    );

    response.json({
      success: true,
      message: "Recruiter dashboard retrieved successfully.",
      data: {
        stats: {
          totalJobs,
          publishedJobs,
          totalApplications,
          awaitingReview,
        },
        recentApplications,
      },
    });
  },
);