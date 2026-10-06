import { Router, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";
import {
  jobSchema,
  jobQuerySchema,
} from "../validators/job.schema.js";

export const jobRouter = Router();

const PAGE_SIZE = 20;

const jobSelect = {
  id: true,
  title: true,
  description: true,
  location: true,
  employmentType: true,
  workMode: true,
  minExperienceYears: true,
  requiredSkills: true,
  preferredSkills: true,
  status: true,
  publishedAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  company: {
    select: {
      id: true,
      name: true,
      website: true,
      industry: true,
      verificationStatus: true,
    },
  },
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

function validationError(response: Response, error: z.ZodError) {
  response.status(400).json({
    success: false,
    message: "Please check the job details.",
    errors: error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  });
}

// Creator ownership and current company membership are both required.
function ownedJobWhere(userId: string): Prisma.JobWhereInput {
  return {
    createdById: userId,
    company: {
      recruiters: {
        some: { userId },
      },
    },
  };
}

jobRouter.use((_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});

jobRouter.use(requireAuth);

jobRouter.param("jobId", (_request, response, next, value: string) => {
  if (!z.uuid().safeParse(value).success) {
    sendError(response, 400, "Invalid job ID.");
    return;
  }

  next();
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (_request, response) =>
    response.locals.auth.user.id as string,
  message: {
    success: false,
    message: "Too many job changes. Try again later.",
    errors: [],
  },
});

// GET /api/jobs - published jobs for signed-in users.
jobRouter.get("/", async (request, response) => {
  const result = jobQuerySchema.safeParse(request.query);

  if (!result.success) {
    validationError(response, result.error);
    return;
  }

  const { page, q } = result.data;

  const where: Prisma.JobWhereInput = {
    status: "PUBLISHED",
  };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      {
        company: {
          name: { contains: q, mode: "insensitive" },
        },
      },
    ];
  }

  const rows = await prisma.job.findMany({
    where,
    select: jobSelect,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
  });

  response.status(200).json({
    success: true,
    message: "Published jobs retrieved successfully.",
    data: {
      jobs: rows.slice(0, PAGE_SIZE),
      page,
      hasMore: rows.length > PAGE_SIZE,
    },
  });
});

// Define /mine before /:jobId so "mine" is not treated as an ID.
jobRouter.get(
  "/mine",
  requireRole("RECRUITER"),
  async (request, response) => {
    const result = jobQuerySchema.safeParse(request.query);

    if (!result.success) {
      validationError(response, result.error);
      return;
    }

    const userId = response.locals.auth.user.id as string;
    const { page, q } = result.data;

    const where: Prisma.JobWhereInput = ownedJobWhere(userId);

    if (q) {
      where.title = { contains: q, mode: "insensitive" };
    }

    const rows = await prisma.job.findMany({
      where,
      select: jobSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1,
    });

    response.status(200).json({
      success: true,
      message: "Your jobs retrieved successfully.",
      data: {
        jobs: rows.slice(0, PAGE_SIZE),
        page,
        hasMore: rows.length > PAGE_SIZE,
      },
    });
  },
);

// Published jobs are readable by all signed-in users.
// Drafts and closed jobs are readable only by their recruiter.
jobRouter.get("/:jobId", async (request, response) => {
  const userId = response.locals.auth.user.id as string;
  const role = response.locals.auth.user.role as string;

  const visibility: Prisma.JobWhereInput[] = [
    { status: "PUBLISHED" },
  ];

  if (role === "RECRUITER") {
    visibility.push(ownedJobWhere(userId));
  }

  const job = await prisma.job.findFirst({
    where: {
      id: request.params.jobId as string,
      OR: visibility,
    },
    select: jobSelect,
  });

  if (!job) {
    sendError(response, 404, "Job not found.");
    return;
  }

  response.status(200).json({
    success: true,
    message: "Job retrieved successfully.",
    data: { job },
  });
});

// Create a draft. Company and creator IDs come from the server.
jobRouter.post(
  "/",
  requireRole("RECRUITER"),
  writeLimiter,
  async (request, response) => {
    const result = jobSchema.safeParse(request.body);

    if (!result.success) {
      validationError(response, result.error);
      return;
    }

    const userId = response.locals.auth.user.id as string;

    const profile = await prisma.recruiterProfile.findUnique({
      where: { userId },
      select: { companyId: true },
    });

    if (!profile?.companyId) {
      sendError(
        response,
        409,
        "Create your company profile before posting a job.",
      );
      return;
    }

    const job = await prisma.job.create({
      data: {
        ...result.data,
        companyId: profile.companyId,
        createdById: userId,
        status: "DRAFT",
      },
      select: jobSelect,
    });

    response.status(201).json({
      success: true,
      message: "Job draft created successfully.",
      data: { job },
    });
  },
);

// PUT replaces all editable fields; status changes use separate routes.
jobRouter.put(
  "/:jobId",
  requireRole("RECRUITER"),
  writeLimiter,
  async (request, response) => {
    const result = jobSchema.safeParse(request.body);

    if (!result.success) {
      validationError(response, result.error);
      return;
    }

    const userId = response.locals.auth.user.id as string;

    const [job] = await prisma.job.updateManyAndReturn({
      where: {
        ...ownedJobWhere(userId),
        id: request.params.jobId as string,
        status: { in: ["DRAFT", "PUBLISHED"] },
      },
      data: result.data,
      select: jobSelect,
    });

    if (!job) {
      sendError(response, 404, "An editable job was not found.");
      return;
    }

    response.status(200).json({
      success: true,
      message: "Job updated successfully.",
      data: { job },
    });
  },
);

// Only drafts can be published.
jobRouter.post(
  "/:jobId/publish",
  requireRole("RECRUITER"),
  writeLimiter,
  async (request, response) => {
    const userId = response.locals.auth.user.id as string;

    const [job] = await prisma.job.updateManyAndReturn({
      where: {
        ...ownedJobWhere(userId),
        id: request.params.jobId as string,
        status: "DRAFT",
      },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        closedAt: null,
      },
      select: jobSelect,
    });

    if (!job) {
      sendError(response, 404, "A publishable job draft was not found.");
      return;
    }

    response.status(200).json({
      success: true,
      message: "Job published successfully.",
      data: { job },
    });
  },
);

// Closing removes a published job from candidate listings.
jobRouter.post(
  "/:jobId/close",
  requireRole("RECRUITER"),
  writeLimiter,
  async (request, response) => {
    const userId = response.locals.auth.user.id as string;

    const [job] = await prisma.job.updateManyAndReturn({
      where: {
        ...ownedJobWhere(userId),
        id: request.params.jobId as string,
        status: "PUBLISHED",
      },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
      },
      select: jobSelect,
    });

    if (!job) {
      sendError(response, 404, "A published job to close was not found.");
      return;
    }

    response.status(200).json({
      success: true,
      message: "Job closed successfully.",
      data: { job },
    });
  },
);