import { fork } from "node:child_process";

export type ResumeOcrResult =
  | {
      status: "COMPLETED" | "NO_TEXT";
      text: string;
      pageCount: number;
      confidence: number;
    }
  | {
      status: "FAILED";
      error: string;
    };

export class OcrBusyError extends Error {
  constructor() {
    super("OCR is busy. Please try again shortly.");
    this.name = "OcrBusyError";
  }
}

// Allow one OCR process at a time per backend instance.
let busy = false;

function isResult(value: unknown): value is ResumeOcrResult {
  if (!value || typeof value !== "object") return false;

  const result = value as Record<string, unknown>;

  if (result.status === "FAILED") {
    return (
      typeof result.error === "string" &&
      result.error.length <= 500
    );
  }

  return (
    (result.status === "COMPLETED" || result.status === "NO_TEXT") &&
    typeof result.text === "string" &&
    result.text.length <= 100_000 &&
    (result.status === "COMPLETED"
      ? result.text.trim().length > 0
      : result.text.length === 0) &&
    typeof result.pageCount === "number" &&
    Number.isInteger(result.pageCount) &&
    result.pageCount >= 1 &&
    result.pageCount <= 5 &&
    typeof result.confidence === "number" &&
    Number.isFinite(result.confidence) &&
    result.confidence >= 0 &&
    result.confidence <= 100
  );
}

export async function runResumeOcr(
  data: Buffer,
): Promise<ResumeOcrResult> {
  if (
    data.length < 5 ||
    data.length > 5 * 1024 * 1024 ||
    data.subarray(0, 5).toString("ascii") !== "%PDF-"
  ) {
    return {
      status: "FAILED",
      error: "Please provide a valid PDF under 5 MB.",
    };
  }

  if (busy) throw new OcrBusyError();

  busy = true;

  try {
    // Development uses TypeScript; the production build uses JavaScript.
    const extension = import.meta.url.endsWith(".ts") ? "ts" : "js";

    const child = fork(
      new URL(`./resume-ocr-worker.${extension}`, import.meta.url),
      [],
      {
        execArgv: ["--max-old-space-size=256"],
        serialization: "advanced",
        stdio: ["ignore", "ignore", "ignore", "ipc"],
        windowsHide: true,
      },
    );

    return await new Promise<ResumeOcrResult>((resolve) => {
      let result: ResumeOcrResult = {
        status: "FAILED",
        error: "The OCR process stopped unexpectedly.",
      };

      let received = false;

      // Parent timeout also covers a worker that becomes unresponsive.
      const timer = setTimeout(() => {
        result = {
          status: "FAILED",
          error: "OCR timed out. Try a smaller PDF.",
        };

        child.kill("SIGKILL");
      }, 130_000);

      child.on("message", (message: unknown) => {
        if (received) return;

        // Ignore Node development watch notifications.
        if (
          message &&
          typeof message === "object" &&
          ("watch:import" in message || "watch:require" in message)
        ) {
          return;
        }

        received = true;

        result = isResult(message)
          ? message
          : {
              status: "FAILED",
              error: "The OCR worker returned an invalid result.",
            };

        child.kill("SIGKILL");
      });

      child.once("error", () => {
        result = {
          status: "FAILED",
          error: "The OCR process could not run.",
        };

        child.kill("SIGKILL");
      });

      // Release the OCR slot only after the process has stopped.
      child.once("close", () => {
        clearTimeout(timer);
        resolve(result);
      });

      child.send(Uint8Array.from(data), (error: Error | null) => {
        if (!error) return;

        result = {
          status: "FAILED",
          error: "Could not send the PDF to the OCR worker.",
        };

        child.kill("SIGKILL");
      });
    });
  } catch {
    return {
      status: "FAILED",
      error: "The OCR process could not start.",
    };
  } finally {
    busy = false;
  }
}