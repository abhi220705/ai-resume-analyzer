import {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} from "node:worker_threads";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_PAGES = 10;
const MAX_TEXT_CHARACTERS = 100_000;
const PARSE_TIMEOUT_MS = 10_000;
const MAX_ACTIVE_WORKERS = 2;

export type ResumeTextResult =
  | {
      status: "COMPLETED" | "NO_TEXT";
      text: string;
      pageCount: number;
    }
  | {
      status: "FAILED";
      error: string;
    };

export class PdfParserBusyError extends Error {
  constructor() {
    super("Resume processing is busy. Please try again shortly.");
    this.name = "PdfParserBusyError";
  }
}

let activeWorkers = 0;

function failed(error: string): ResumeTextResult {
  return { status: "FAILED", error };
}

function isParseResult(value: unknown): value is ResumeTextResult {
  if (!value || typeof value !== "object") return false;

  const result = value as Record<string, unknown>;

  if (result.status === "FAILED") {
    return (
      typeof result.error === "string" &&
      result.error.length > 0 &&
      result.error.length <= 500
    );
  }

  return (
    (result.status === "COMPLETED" || result.status === "NO_TEXT") &&
    typeof result.text === "string" &&
    result.text.length <= MAX_TEXT_CHARACTERS &&
    (result.status === "NO_TEXT"
      ? result.text.length === 0
      : result.text.trim().length > 0) &&
    typeof result.pageCount === "number" &&
    Number.isInteger(result.pageCount) &&
    result.pageCount >= 1 &&
    result.pageCount <= MAX_PAGES
  );
}

// Called by the API. The PDF work runs in a separate thread.
export async function parseResumePdf(
  data: Uint8Array,
): Promise<ResumeTextResult> {
  if (data.byteLength === 0 || data.byteLength > MAX_FILE_BYTES) {
    return failed("The PDF must be non-empty and 5 MiB or smaller.");
  }

  if (Buffer.from(data.subarray(0, 5)).toString("ascii") !== "%PDF-") {
    return failed("The stored file does not have a valid PDF header.");
  }

  if (activeWorkers >= MAX_ACTIVE_WORKERS) {
    throw new PdfParserBusyError();
  }

  activeWorkers += 1;
  let worker: Worker | undefined;

  try {
    // Node 24 runs this .ts file in development and its .js build in production.
    worker = new Worker(new URL(import.meta.url), {
      workerData: Uint8Array.from(data),
      execArgv: [],
      resourceLimits: {
        maxOldGenerationSizeMb: 128,
        maxYoungGenerationSizeMb: 32,
      },
      stdout: true,
      stderr: true,
    });

    // Discard parser diagnostics so document content is not logged.
    worker.stdout.resume();
    worker.stderr.resume();

    const runningWorker = worker;

    return await new Promise<ResumeTextResult>((resolve) => {
      let settled = false;

      const timer = setTimeout(() => {
        finish(failed("Text extraction timed out. Try a simpler PDF."));
      }, PARSE_TIMEOUT_MS);

      function finish(result: ResumeTextResult) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      }

                runningWorker.on("message", (message: unknown) => {
        // Ignore Node's development watch notifications.
        if (
          message !== null &&
          typeof message === "object" &&
          ("watch:import" in message || "watch:require" in message)
        ) {
          return;
        }

        finish(
          isParseResult(message)
            ? message
            : failed("The PDF parser returned an unexpected result."),
        );
      });

      runningWorker.once("error", () => {
        finish(failed("The PDF parser could not process this file."));
      });

      runningWorker.once("exit", () => {
        finish(failed("The PDF parser stopped before returning a result."));
      });
    });
  } catch {
    return failed("The PDF parser could not start. Please try again.");
  } finally {
    // Terminate timed-out work before making its worker slot available again.
    if (worker) {
      await worker.terminate().catch(() => undefined);
    }
    activeWorkers -= 1;
  }
}

async function extractText(data: Uint8Array): Promise<ResumeTextResult> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({
    data,
    isEvalSupported: false,
    stopAtErrors: true,
    verbosity: 0,
  });

  try {
    const info = await parser.getInfo();

    if (!Number.isInteger(info.total) || info.total < 1) {
      return failed("The PDF does not contain any readable pages.");
    }

    if (info.total > MAX_PAGES) {
      return failed("Resume text extraction supports PDFs with up to 10 pages.");
    }

    const parts: string[] = [];
    let characterCount = 0;

    for (let pageNumber = 1; pageNumber <= info.total; pageNumber += 1) {
      const result = await parser.getText({
        partial: [pageNumber],
        pageJoiner: "",
        parseHyperlinks: false,
      });

      const page = result.pages.find((item) => item.num === pageNumber);

      if (!page) {
        return failed("A page could not be read. Try exporting the PDF again.");
      }

      characterCount += page.text.length + (pageNumber > 1 ? 2 : 0);

      if (characterCount > MAX_TEXT_CHARACTERS) {
        return failed("The extracted text exceeds the 100,000-character limit.");
      }

      parts.push(
        page.text
          .replace(/\r\n?/g, "\n")
          .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
          .trim(),
      );
    }

    const text = parts.join("\n\n").trim();

    return {
      status: text.length > 0 ? "COMPLETED" : "NO_TEXT",
      text,
      pageCount: info.total,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException") {
      return failed("This PDF requires a password. Upload an unlocked copy.");
    }

    return failed(
      "Text could not be extracted. The PDF may be damaged or unsupported.",
    );
  } finally {
    await parser.destroy();
  }
}

if (!isMainThread && parentPort) {
  let result: ResumeTextResult;

  try {
    if (!(workerData instanceof Uint8Array)) {
      throw new Error("Invalid parser input.");
    }

    result = await extractText(workerData);
  } catch {
    result = failed("The PDF parser could not complete the extraction.");
  }

  parentPort.postMessage(result);
  parentPort.close();
}