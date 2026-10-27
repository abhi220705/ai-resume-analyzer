import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import {
  createResumeDraftSchema,
  updateResumeDraftSchema,
  resumeDraftIdSchema,
} from "../lib/resume-draft-schema.js";
import {
  InvalidResumePhotoError,
  prepareResumePhoto,
  saveResumePhoto,
  readResumePhoto,
  removeResumePhoto,
} from "../lib/resume-photo-storage.js";

export const resumeDraftRouter = Router();

resumeDraftRouter.use(requireAuth);

resumeDraftRouter.use((_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");

  if (response.locals.auth.user.role !== "CANDIDATE") {
    response.status(403).json({
      success: false,
      message: "Resume building is available to candidates only.",
      errors: [],
    });
    return;
  }

  next();
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (_request, response) =>
    response.locals.auth.user.id,
  message: {
    success: false,
    message: "Too many save requests. Please try again later.",
    errors: [],
  },
});

async function cleanUpPhoto(key: string | null) {
  if (!key) return;

  try {
    await removeResumePhoto(key);
  } catch {
    // A cleanup failure must not report a successful save as failed.
    console.error("An unused resume photo could not be removed.");
  }
}

resumeDraftRouter.get("/", async (_request, response) => {
  const drafts = await prisma.resumeDraft.findMany({
    where: { userId: response.locals.auth.user.id },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      revision: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  response.json({ success: true, data: { drafts } });
});

resumeDraftRouter.get("/:draftId", async (request, response) => {
  const id = resumeDraftIdSchema.safeParse(request.params.draftId);

  if (!id.success) {
    response.status(400).json({
      success: false,
      message: "Invalid draft ID.",
      errors: [],
    });
    return;
  }

  const draft = await prisma.resumeDraft.findFirst({
    where: {
      id: id.data,
      userId: response.locals.auth.user.id,
    },
  });

  if (!draft) {
    response.status(404).json({
      success: false,
      message: "Resume draft not found.",
      errors: [],
    });
    return;
  }

  // Read only the photo referenced by this owned draft.
  const photoDataUrl = draft.photoStorageKey
    ? await readResumePhoto(draft.photoStorageKey)
    : null;

  response.json({
    success: true,
    data: {
      draft: { ...draft, photoDataUrl },
    },
  });
});

resumeDraftRouter.post(
  "/",
  writeLimiter,
  async (request, response) => {
    const result = createResumeDraftSchema.safeParse(request.body);

    if (!result.success) {
      response.status(400).json({
        success: false,
        message: "Please check your resume details.",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }

    let photoStorageKey: string | null = null;

    if (result.data.photoDataUrl) {
      let buffer: Buffer;

      try {
        buffer = await prepareResumePhoto(result.data.photoDataUrl);
      } catch (error) {
        if (!(error instanceof InvalidResumePhotoError)) throw error;

        response.status(400).json({
          success: false,
          message: error.message,
          errors: [],
        });
        return;
      }

      photoStorageKey = await saveResumePhoto(buffer);
    }

    const data = {
      ...result.data.data,
      photo: {
        storageKey: null,
        showOnResume:
          Boolean(photoStorageKey) &&
          result.data.data.photo.showOnResume,
      },
    };

    // If a database connection fails ambiguously, retain the uploaded
    // file rather than risk deleting a photo that was committed.
    const draft = await prisma.resumeDraft.create({
      data: {
        userId: response.locals.auth.user.id,
        title: data.title,
        data,
        photoStorageKey,
      },
    });

    response.status(201).json({
      success: true,
      message: "Resume draft saved.",
      data: { draft },
    });
  },
);

resumeDraftRouter.put(
  "/:draftId",
  writeLimiter,
  async (request, response) => {
    const id = resumeDraftIdSchema.safeParse(request.params.draftId);
    const result = updateResumeDraftSchema.safeParse(request.body);

    if (!id.success) {
      response.status(400).json({
        success: false,
        message: "Invalid draft ID.",
        errors: [],
      });
      return;
    }

    if (!result.success) {
      response.status(400).json({
        success: false,
        message: "Please check your resume details.",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }

    const userId = response.locals.auth.user.id;

    const existing = await prisma.resumeDraft.findFirst({
      where: { id: id.data, userId },
    });

    if (!existing) {
      response.status(404).json({
        success: false,
        message: "Resume draft not found.",
        errors: [],
      });
      return;
    }

    if (existing.revision !== result.data.revision) {
      response.status(409).json({
        success: false,
        message:
          "This resume has newer saved changes. Open the latest version, or save your current work as a new copy.",
        errors: [],
      });
      return;
    }

    const { photoDataUrl } = result.data;
    let photoStorageKey = existing.photoStorageKey;
    let newPhotoKey: string | null = null;

    if (photoDataUrl === null) {
      photoStorageKey = null;
    } else if (typeof photoDataUrl === "string") {
      let buffer: Buffer;

      try {
        buffer = await prepareResumePhoto(photoDataUrl);
      } catch (error) {
        if (!(error instanceof InvalidResumePhotoError)) throw error;

        response.status(400).json({
          success: false,
          message: error.message,
          errors: [],
        });
        return;
      }

      newPhotoKey = await saveResumePhoto(buffer);
      photoStorageKey = newPhotoKey;
    }

    const data = {
      ...result.data.data,
      photo: {
        storageKey: null,
        showOnResume:
          Boolean(photoStorageKey) &&
          result.data.data.photo.showOnResume,
      },
    };

    const draft = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.resumeDraft.updateMany({
        where: {
          id: id.data,
          userId,
          revision: result.data.revision,
        },
        data: {
          title: data.title,
          data,
          photoStorageKey,
          revision: { increment: 1 },
        },
      });

      if (updated.count === 0) return null;

      return transaction.resumeDraft.findFirstOrThrow({
        where: { id: id.data, userId },
      });
    });

    if (!draft) {
      await cleanUpPhoto(newPhotoKey);

      response.status(409).json({
        success: false,
        message:
          "The draft changed while saving. Open the latest version, or save your current work as a new copy.",
        errors: [],
      });
      return;
    }

    if (existing.photoStorageKey !== photoStorageKey) {
      await cleanUpPhoto(existing.photoStorageKey);
    }

    response.json({
      success: true,
      message: "Resume draft saved.",
      data: { draft },
    });
  },
);