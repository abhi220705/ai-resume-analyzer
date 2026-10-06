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

dashboardRouter.use(requireAuth, requireRole("CANDIDATE"));

// GET /api/dashboard/candidate
dashboardRouter.get("/candidate", async (_request, response) => {
  const userId = response.locals.auth.user.id as string;

  // Read the counts and recent applications from one database snapshot.
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
        where: {
          userId,
          parseStatus: "COMPLETED",
        },
      }),

      prisma.application.count({
        where: { candidateId: userId },
      }),

      prisma.application.count({
        where: {
          candidateId: userId,
          status: {
            in: ["SUBMITTED", "REVIEWING", "SHORTLISTED"],
          },
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
              company: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ],
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    },
  );

  response.status(200).json({
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
});