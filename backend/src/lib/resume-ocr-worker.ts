import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PDFParse } from "pdf-parse";
import { createWorker, PSM } from "tesseract.js";

const cachePath = fileURLToPath(
  new URL("../../storage/ocr-cache/", import.meta.url),
);

async function extract(data: Uint8Array) {
  const parser = new PDFParse({
    data,
    isEvalSupported: false,
    stopAtErrors: true,
    verbosity: 0,
    maxImageSize: 16_000_000,
  });

  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;

  try {
    const info = await parser.getInfo({ parsePageInfo: true });

    if (
      !Number.isInteger(info.total) ||
      info.total < 1 ||
      info.total > 5
    ) {
      throw new Error("OCR supports PDFs containing 1 to 5 pages.");
    }

    await mkdir(cachePath, { recursive: true, mode: 0o700 });

    worker = await createWorker("eng", 1, { cachePath });

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
    });

    const texts: string[] = [];
    let confidence = 0;
    let characters = 0;

    for (let pageNumber = 1; pageNumber <= info.total; pageNumber++) {
      const page = info.pages.find(
        (item) => item.pageNumber === pageNumber,
      );

      if (
        !page ||
        !Number.isFinite(page.width) ||
        !Number.isFinite(page.height) ||
        page.width <= 0 ||
        page.height <= 0
      ) {
        throw new Error("The PDF contains invalid page dimensions.");
      }

      // Limit the longest image edge before rendering.
      const scale = Math.min(
        2.5,
        2200 / Math.max(page.width, page.height),
      );

      const screenshot = await parser.getScreenshot({
        partial: [pageNumber],
        scale,
        imageBuffer: true,
        imageDataUrl: false,
      });

      const picture = screenshot.pages[0];

      if (
        !picture?.data.length ||
        picture.width * picture.height > 5_000_000
      ) {
        throw new Error(
          "A PDF page could not be rendered within the OCR limit.",
        );
      }

      const result = await worker.recognize(
        Buffer.from(picture.data),
      );

      const text = result.data.text
        .replace(/\r\n?/g, "\n")
        .replace(
          /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
          "",
        )
        .trim();

      characters += text.length + 2;

      if (characters > 100_000) {
        throw new Error("OCR text exceeds the supported limit.");
      }

      texts.push(text);

      confidence += Number.isFinite(result.data.confidence)
        ? result.data.confidence
        : 0;
    }

    const text = texts.join("\n\n").trim();

    return {
      status: text ? "COMPLETED" : "NO_TEXT",
      text,
      pageCount: info.total,
      confidence: Math.max(
        0,
        Math.min(100, confidence / info.total),
      ),
    };
  } finally {
    await worker?.terminate().catch(() => undefined);
    await parser.destroy().catch(() => undefined);
  }
}

function finish(result: unknown) {
  if (!process.send) {
    process.exit(1);
  }

  process.send(result, () => process.exit(0));
}

// This file runs inside a separate child process.
if (process.send) {
  setTimeout(() => {
    finish({
      status: "FAILED",
      error: "OCR timed out. Try a smaller PDF.",
    });
  }, 120_000).unref();

  process.once("disconnect", () => process.exit(1));

  process.once("message", (message: unknown) => {
    if (
      !(message instanceof Uint8Array) ||
      message.length < 5 ||
      message.length > 5 * 1024 * 1024 ||
      Buffer.from(message.subarray(0, 5)).toString("ascii") !== "%PDF-"
    ) {
      finish({
        status: "FAILED",
        error: "Please provide a valid PDF under 5 MB.",
      });
      return;
    }

    void extract(message)
      .then(finish)
      .catch(() => {
        finish({
          status: "FAILED",
          error:
            "OCR failed. Use an unlocked PDF of 1 to 5 pages and check the server internet connection for the first language download.",
        });
      });
  });
}