import { Router, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { hashResumeText } from "../lib/resume-analysis.js";
import {
  generateResumeFeedback,
  AI_PROMPT_VERSION,
} from "../lib/resume-ai.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";

export const resumeAiRouter = Router();

// Prevent duplicate AI calls within this backend process.
const running = new Set<string>();

resumeAiRouter.use(requireAuth, requireRole("CANDIDATE"));

resumeAiRouter.use((_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (_request, response) =>
    response.locals.auth.user.id as string,
  message: {
    success: false,
    message: "Too many AI requests. Try again later.",
    errors: [],
  },
});

function fail(response: Response, status: number, message: string) {
  response.status(status).json({
    success: false,
    message,
    errors: [],
  });
}

async function handleFeedback(request: Request, response: Response) {
  const parsedId = z.string().uuid().safeParse(request.params.resumeId);

  if (!parsedId.success) {
    fail(response, 400, "Invalid resume ID.");
    return;
  }

  const resumeId = parsedId.data;
  const userId = response.locals.auth.user.id as string;

  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, userId },
    include: { aiFeedback: true },
  });

  if (!resume) {
    fail(response, 404, "Resume not found.");
    return;
  }

  const text = resume.extractedText;

  if (resume.parseStatus !== "COMPLETED" || !text?.trim()) {
    fail(response, 409, "Extract readable resume text first.");
    return;
  }

  const model = process.env.GROQ_MODEL;
  const sourceTextHash = hashResumeText(text);
  const saved = resume.aiFeedback;

  const isCurrent =
    saved !== null &&
    saved.provider === "groq" &&
    saved.model === model &&
    saved.promptVersion === AI_PROMPT_VERSION &&
    saved.sourceTextHash === sourceTextHash;

  if (isCurrent && saved) {
    response.json({
      success: true,
      data: {
        feedback: saved.feedback,
        model: saved.model,
        cached: true,
      },
    });
    return;
  }

  // GET retrieves saved feedback; it never calls the AI provider.
  if (request.method === "GET") {
    response.json({
      success: true,
      data: { feedback: null, needsAnalysis: true },
    });
    return;
  }

  if (request.body?.consent !== true) {
    fail(
      response,
      400,
      "Please agree to send your extracted resume text to Groq for AI feedback.",
    );
    return;
  }

  if (!model || !process.env.GROQ_API_KEY) {
    fail(response, 503, "AI feedback is not configured.");
    return;
  }

  if (text.trim().length > 20_000) {
    fail(response, 422, "AI feedback supports up to 20,000 characters.");
    return;
  }

  if (running.has(resumeId)) {
    fail(response, 409, "AI feedback is already being generated.");
    return;
  }

  running.add(resumeId);

  try {
    let feedback;

       try {
      feedback = await generateResumeFeedback(text);
    } catch (error) {
      console.error(
        "AI feedback failed:",
        error instanceof Error ? error.message : "Unknown error",
      );

      fail(
        response,
        502,
        "AI feedback could not be generated. Please try again later.",
      );
      return;
    }

    // Do not save a result if the source changed during generation.
    const current = await prisma.resume.findFirst({
      where: { id: resumeId, userId },
      select: { extractedText: true, parseStatus: true },
    });

    if (
      !current ||
      current.parseStatus !== "COMPLETED" ||
      hashResumeText(current.extractedText ?? "") !== sourceTextHash
    ) {
      fail(response, 409, "The resume changed. Please run AI feedback again.");
      return;
    }

    const values = {
      provider: "groq",
      model,
      promptVersion: AI_PROMPT_VERSION,
      sourceTextHash,
      feedback,
    };

    await prisma.resumeAiFeedback.upsert({
      where: { resumeId },
      create: { resumeId, ...values },
      update: values,
    });

    response.json({
      success: true,
      data: { feedback, model, cached: false },
    });
  } finally {
    running.delete(resumeId);
  }
}

resumeAiRouter.get("/:resumeId/ai-feedback", handleFeedback);
resumeAiRouter.post("/:resumeId/ai-feedback", aiLimiter, handleFeedback);