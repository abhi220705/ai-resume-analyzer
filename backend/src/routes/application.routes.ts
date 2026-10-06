import { Router, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";

export const applicationRouter = Router();

const applySchema = z.strictObject({
  jobId: z.uuid(),
  resumeId: z.uuid(),
  coverLetter: z.string().trim().max(3000).optional(),
});

const statusSchema = z.strictObject({
  expectedStatus: z.enum(["SUBMITTED", "REVIEWING", "SHORTLISTED"]),
  status: z.enum(["REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"]),
});

const pageSchema = z.strictObject({
  page: z
    .string()
    .regex(/^[1-9]\d{0,3}$/)
    .transform(Number)
    .default(1),
});

const transitions: Record<string, readonly string[]> = {
  SUBMITTED: ["REVIEWING", "REJECTED"],
  REVIEWING: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["HIRED", "REJECTED"],
};

const activeStatuses = [
  "SUBMITTED",
  "REVIEWING",
  "SHORTLISTED",
] as const;

const applicationSelect = {
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  candidate: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  job: {
    select: {
      id: true,
      title: true,
      status: true,
      company: {
        select: { id: true, name: true },
      },
    },
  },
  resume: {
    select: { id: true, originalName: true },
  },
} as const;

function fail(response: Response, status: number, message: string) {
  response.status(status).json({
    success: false,
    message,
    errors: [],
  });
}

function invalid(response: Response, error: z.ZodError) {
  response.status(400).json({
    success: false,
    message: "Please check your application details.",
    errors: error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  });
}

function recruiterScope(userId: string): Prisma.ApplicationWhereInput {
  return {
    job: {
      createdById: userId,
      company: {
        recruiters: { some: { userId } },
      },
    },
  };
}

applicationRouter.use((_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});

applicationRouter.use(requireAuth);

applicationRouter.param(
  "applicationId",
  (_request, response, next, value: string) => {
    if (!z.uuid().safeParse(value).success) {
      fail(response, 400, "Invalid application ID.");
      return;
    }
    next();
  },
);

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (_request, response) =>
    response.locals.auth.user.id as string,
  message: {
    success: false,
    message: "Too many application requests. Try again later.",
    errors: [],
  },
});

// Candidate submits their own parsed resume to a published job.
applicationRouter.post(
  "/",
  requireRole("CANDIDATE"),
  writeLimiter,
  async (request, response) => {
    const parsed = applySchema.safeParse(request.body);

    if (!parsed.success) {
      invalid(response, parsed.error);
      return;
    }

    const candidateId = response.locals.auth.user.id as string;
    const { jobId, resumeId, coverLetter } = parsed.data;

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const job = await tx.job.findFirst({
            where: { id: jobId, status: "PUBLISHED" },
            select: { id: true },
          });

          const resume = await tx.resume.findFirst({
            where: { id: resumeId, userId: candidateId },
            select: {
              id: true,
              parseStatus: true,
              extractedText: true,
            },
          });

          if (!job || !resume) {
            return { kind: "missing" as const };
          }

          if (
            resume.parseStatus !== "COMPLETED" ||
            !resume.extractedText?.trim() ||
            resume.extractedText.length > 100_000
          ) {
            return { kind: "unparsed" as const };
          }

          const application = await tx.application.create({
            data: {
              candidateId,
              jobId,
              resumeId,
              coverLetter: coverLetter || null,
              resumeTextSnapshot: resume.extractedText,
              status: "SUBMITTED",
            },
            select: applicationSelect,
          });

          return { kind: "created" as const, application };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      if (result.kind === "missing") {
        fail(response, 404, "Resume or published job not found.");
        return;
      }

      if (result.kind === "unparsed") {
        fail(response, 409, "Extract readable resume text before applying.");
        return;
      }

      response.status(201).json({
        success: true,
        message: "Application submitted successfully.",
        data: { application: result.application },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          fail(response, 409, "You have already applied to this job.");
          return;
        }

        if (error.code === "P2034") {
          fail(
            response,
            409,
            "Details changed during submission. Refresh and try again.",
          );
          return;
        }
      }

      throw error;
    }
  },
);

// Candidate application list.
applicationRouter.get(
  "/mine",
  requireRole("CANDIDATE"),
  async (request, response) => {
    const parsed = pageSchema.safeParse(request.query);

    if (!parsed.success) {
      invalid(response, parsed.error);
      return;
    }

    const page = parsed.data.page;
    const candidateId = response.locals.auth.user.id as string;

    const rows = await prisma.application.findMany({
      where: { candidateId },
      select: applicationSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * 20,
      take: 21,
    });

    response.json({
      success: true,
      message: "Your applications retrieved.",
      data: {
        applications: rows.slice(0, 20),
        page,
        hasMore: rows.length > 20,
      },
    });
  },
);

// Recruiter sees applications only for jobs they created.
applicationRouter.get(
  "/received",
  requireRole("RECRUITER"),
  async (request, response) => {
    const parsed = pageSchema.safeParse(request.query);

    if (!parsed.success) {
      invalid(response, parsed.error);
      return;
    }

    const page = parsed.data.page;
    const userId = response.locals.auth.user.id as string;

    const rows = await prisma.application.findMany({
      where: recruiterScope(userId),
      select: applicationSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * 20,
      take: 21,
    });

    response.json({
      success: true,
      message: "Received applications retrieved.",
      data: {
        applications: rows.slice(0, 20),
        page,
        hasMore: rows.length > 20,
      },
    });
  },
);

// Detail includes submitted text, not the candidate's other resumes.
applicationRouter.get("/:applicationId", async (request, response) => {
  const userId = response.locals.auth.user.id as string;
  const role = response.locals.auth.user.role as string;

  let scope: Prisma.ApplicationWhereInput;

  if (role === "CANDIDATE") {
    scope = { candidateId: userId };
  } else if (role === "RECRUITER") {
    scope = recruiterScope(userId);
  } else {
    fail(response, 403, "This account cannot view applications.");
    return;
  }

  const application = await prisma.application.findFirst({
    where: {
      ...scope,
      id: request.params.applicationId as string,
    },
    select: {
      ...applicationSelect,
      coverLetter: true,
      resumeTextSnapshot: true,
    },
  });

  if (!application) {
    fail(response, 404, "Application not found.");
    return;
  }

  // Stop returning submitted text to recruiters after withdrawal.
  if (role === "RECRUITER" && application.status === "WITHDRAWN") {
    fail(response, 403, "This application has been withdrawn.");
    return;
  }

  response.json({
    success: true,
    message: "Application retrieved.",
    data: { application },
  });
});

// Candidate withdrawal is allowed only while the application is active.
applicationRouter.post(
  "/:applicationId/withdraw",
  requireRole("CANDIDATE"),
  writeLimiter,
  async (request, response) => {
    const candidateId = response.locals.auth.user.id as string;

    const [application] = await prisma.application.updateManyAndReturn({
      where: {
        id: request.params.applicationId as string,
        candidateId,
        status: { in: [...activeStatuses] },
      },
      data: { status: "WITHDRAWN" },
      select: applicationSelect,
    });

    if (!application) {
      fail(response, 409, "No active application available to withdraw.");
      return;
    }

    response.json({
      success: true,
      message: "Application withdrawn.",
      data: { application },
    });
  },
);

// The expected status prevents overwriting another recent status change.
applicationRouter.patch(
  "/:applicationId/status",
  requireRole("RECRUITER"),
  writeLimiter,
  async (request, response) => {
    const parsed = statusSchema.safeParse(request.body);

    if (!parsed.success) {
      invalid(response, parsed.error);
      return;
    }

    const { expectedStatus, status } = parsed.data;

    if (!transitions[expectedStatus]?.includes(status)) {
      fail(response, 400, "This status transition is not allowed.");
      return;
    }

    const userId = response.locals.auth.user.id as string;

    const [application] = await prisma.application.updateManyAndReturn({
      where: {
        ...recruiterScope(userId),
        id: request.params.applicationId as string,
        status: expectedStatus,
      },
      data: { status },
      select: applicationSelect,
    });

    if (!application) {
      fail(
        response,
        409,
        "Application unavailable or status changed. Refresh and try again.",
      );
      return;
    }

    response.json({
      success: true,
      message: "Application status updated.",
      data: { application },
    });
  },
);