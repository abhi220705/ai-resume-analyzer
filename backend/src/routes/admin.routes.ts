import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";

export const adminRouter = Router();

adminRouter.use((_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});

adminRouter.use(requireAuth, requireRole("ADMIN"));

const PAGE_SIZE = 20;

const pageSchema = z.strictObject({
  page: z
    .string()
    .regex(/^[1-9]\d{0,3}$/)
    .transform(Number)
    .default(1),
});

const verificationSchema = z.strictObject({
  status: z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"]),
  expectedUpdatedAt: z.string().datetime(),
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
    message: "Too many admin changes. Please try again later.",
    errors: [],
  },
});

const companySelect = {
  id: true,
  name: true,
  website: true,
  industry: true,
  location: true,
  description: true,
  verificationStatus: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

// GET /api/admin/stats
adminRouter.get("/stats", async (_request, response) => {
  const [
    users,
    candidates,
    recruiters,
    companies,
    verifiedCompanies,
    jobs,
    publishedJobs,
    applications,
    resumes,
  ] = await prisma.$transaction(
    [
      prisma.user.count(),
      prisma.user.count({ where: { role: "CANDIDATE" } }),
      prisma.user.count({ where: { role: "RECRUITER" } }),
      prisma.company.count(),
      prisma.company.count({
        where: { verificationStatus: "VERIFIED" },
      }),
      prisma.job.count(),
      prisma.job.count({ where: { status: "PUBLISHED" } }),
      prisma.application.count(),
      prisma.resume.count(),
    ],
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    },
  );

  response.json({
    success: true,
    message: "Platform statistics retrieved.",
    data: {
      stats: {
        users,
        candidates,
        recruiters,
        companies,
        verifiedCompanies,
        jobs,
        publishedJobs,
        applications,
        resumes,
      },
    },
  });
});

// GET /api/admin/users?page=1
adminRouter.get("/users", async (request, response) => {
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

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
  });

  response.json({
    success: true,
    message: "Users retrieved.",
    data: {
      users: users.slice(0, PAGE_SIZE),
      page,
      hasMore: users.length > PAGE_SIZE,
    },
  });
});

// GET /api/admin/companies?page=1
adminRouter.get("/companies", async (request, response) => {
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

  const companies = await prisma.company.findMany({
    select: companySelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
  });

  response.json({
    success: true,
    message: "Companies retrieved.",
    data: {
      companies: companies.slice(0, PAGE_SIZE),
      page,
      hasMore: companies.length > PAGE_SIZE,
    },
  });
});

// PATCH /api/admin/companies/:companyId/verification
adminRouter.patch(
  "/companies/:companyId/verification",
  writeLimiter,
  async (request, response) => {
    const companyId = z.uuid().safeParse(request.params.companyId);
    const parsed = verificationSchema.safeParse(request.body);

    if (!companyId.success || !parsed.success) {
      response.status(400).json({
        success: false,
        message: "Provide a valid company ID, status, and update timestamp.",
        errors: [],
      });
      return;
    }

    // Only update the exact version the admin reviewed.
    const [company] = await prisma.company.updateManyAndReturn({
      where: {
        id: companyId.data,
        updatedAt: new Date(parsed.data.expectedUpdatedAt),
      },
      data: {
        verificationStatus: parsed.data.status,
      },
      select: {
        id: true,
        verificationStatus: true,
        updatedAt: true,
      },
    });

    if (!company) {
      response.status(409).json({
        success: false,
        message:
          "Company details changed or the company is unavailable. Refresh and review again.",
        errors: [],
      });
      return;
    }

    response.json({
      success: true,
      message: "Company verification status updated.",
      data: { company },
    });
  },
);