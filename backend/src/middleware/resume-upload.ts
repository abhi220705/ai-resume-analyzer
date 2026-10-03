import { extname } from "node:path";
import type { RequestHandler } from "express";
import multer from "multer";

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const PDF_SIGNATURE = Buffer.from("%PDF-", "ascii");

const parseResume = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_RESUME_BYTES,
    files: 1,
    fields: 0,
    parts: 1,
    fieldNameSize: 100,
  },
}).single("resume");

// Attach this after authentication and the candidate role check.
export const receiveResume: RequestHandler = (
  request,
  response,
  next,
) => {
  function rejectUpload(status: number, message: string) {
    response.status(status).json({
      success: false,
      message,
      errors: [],
    });
  }

  if (!request.is("multipart/form-data")) {
    rejectUpload(
      415,
      "Send the PDF using multipart/form-data.",
    );
    return;
  }

  parseResume(request, response, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        rejectUpload(413, "The PDF must be 5 MiB or smaller.");
      } else {
        rejectUpload(
          400,
          "Upload exactly one file using the resume field, with no extra fields.",
        );
      }
      return;
    }

    if (error) {
      next(error);
      return;
    }

    const file = request.file;

    if (!file || file.size === 0) {
      rejectUpload(400, "Please select a non-empty PDF file.");
      return;
    }

    if (
      file.originalname.length > 255 ||
      /[\u0000-\u001f\u007f]/.test(file.originalname)
    ) {
      rejectUpload(
        400,
        "Use a filename of up to 255 characters without control characters.",
      );
      return;
    }

    const hasPdfExtension =
      extname(file.originalname).toLowerCase() === ".pdf";

    const hasPdfMimeType =
      file.mimetype.toLowerCase() === "application/pdf";

    const hasPdfSignature = file.buffer
      .subarray(0, PDF_SIGNATURE.length)
      .equals(PDF_SIGNATURE);

    if (!hasPdfExtension || !hasPdfMimeType || !hasPdfSignature) {
      rejectUpload(
        415,
        "The uploaded file must be a PDF with a PDF header.",
      );
      return;
    }

    next();
  });
};