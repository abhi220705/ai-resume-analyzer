import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";

export const adminActivityRouter = Router();

adminActivityRouter.use((_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});

adminActivityRouter.use(requireAuth, requireRole("ADMIN"));

const PAGE_SIZE = 20;

const pageSchema = z.strictObject({
  page: z
    .string()
    .regex(/^[1-9]\d{0,3}$/)
    .transform(Number)
    .default(1),
});

const closeSchema = z.strictObject({
  expectedUpdatedAt: z.string().datetime(),
});

const moderationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (_request, response) =>
    response.locals.auth.user.id as string,
  message: {
    success: false,
    message: "Too many moderation requests. Please try again later.",
    errors: [],
  },
});

// GET /api/admin/jobs?page=1
adminActivityRouter.get("/jobs", async (request, response) => {
  const parsed = pageSchema.safeParse(request.query);

  if (!parsed.success) {
    response.status(400).json({
      success: false,
      message: "Page must be a whole number between 1 and 9999.",
      errors: [],
    });
    return;
  }

  const page = parsed.data.page;

  const rows = await prisma.job.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      company: {
        select: {
          name: true,
          verificationStatus: true,
        },
      },
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
      _count: {
        select: { applications: true },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
  });

  response.json({
    success: true,
    message: "Jobs retrieved.",
    data: {
      jobs: rows.slice(0, PAGE_SIZE),
      page,
      hasMore: rows.length > PAGE_SIZE,
    },
  });
});

// POST /api/admin/jobs/:jobId/close
adminActivityRouter.post(
  "/jobs/:jobId/close",
  moderationLimiter,
  async (request, response) => {
    const jobId = z.uuid().safeParse(request.params.jobId);
    const parsed = closeSchema.safeParse(request.body);

    if (!jobId.success || !parsed.success) {
      response.status(400).json({
        success: false,
        message: "Provide a valid job ID and update timestamp.",
        errors: [],
      });
      return;
    }

    // Close only the published version the admin reviewed.
    const [job] = await prisma.job.updateManyAndReturn({
      where: {
        id: jobId.data,
        status: "PUBLISHED",
        updatedAt: new Date(parsed.data.expectedUpdatedAt),
      },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
      },
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
      },
    });

    if (!job) {
      response.status(409).json({
        success: false,
        message:
          "Job changed, is no longer published, or is unavailable. Refresh and review again.",
        errors: [],
      });
      return;
    }

    response.json({
      success: true,
      message: "Job closed. Existing applications have been preserved.",
      data: { job },
    });
  },
);

// GET /api/admin/applications?page=1
adminActivityRouter.get("/applications", async (request, response) => {
  const parsed = pageSchema.safeParse(request.query);

  if (!parsed.success) {
    response.status(400).json({
      success: false,
      message: "Page must be a whole number between 1 and 9999.",
      errors: [],
    });
    return;
  }

  const page = parsed.data.page;

  const rows = await prisma.application.findMany({
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      candidate: {
        select: {
          name: true,
          email: true,
        },
      },
      job: {
        select: {
          title: true,
          status: true,
          company: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
  });

  response.json({
    success: true,
    message: "Applications retrieved.",
    data: {
      applications: rows.slice(0, PAGE_SIZE),
      page,
      hasMore: rows.length > PAGE_SIZE,
    },
  });
});