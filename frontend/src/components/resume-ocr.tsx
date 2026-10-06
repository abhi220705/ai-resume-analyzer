"use client";

import { useEffect, useState } from "react";
import { authenticatedRequest } from "@/lib/api";
import { ResumeIntegrity } from "@/components/resume-integrity";

type ResumeOption = {
  id: string;
  originalName: string;
};

type OcrResume = {
  id: string;
  originalName: string;
  ocrStatus:
    | "PENDING"
    | "PROCESSING"
    | "COMPLETED"
    | "NO_TEXT"
    | "FAILED";
  ocrText: string | null;
  ocrPageCount: number | null;
  ocrConfidence: number | null;
  ocrError: string | null;
  ocrStartedAt: string | null;
  ocrCompletedAt: string | null;
};

const buttonClass =
  "rounded-xl border border-slate-300 px-4 py-2 font-semibold " +
  "hover:bg-slate-100 disabled:opacity-50";

export function ResumeOcr() {
  const [resumes, setResumes] = useState<ResumeOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    void authenticatedRequest<{ resumes: ResumeOption[] }>(
      "/api/resumes",
    )
      .then((data) => {
        if (!active) return;

        setResumes(data.resumes);
        setSelectedId((current) =>
          data.resumes.some((resume) => resume.id === current)
            ? current
            : (data.resumes[0]?.id ?? ""),
        );
      })
      .catch((error: unknown) => {
        if (!active) return;

        setError(
          error instanceof Error
            ? error.message
            : "Could not load resumes.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reload]);

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Read resume with OCR</h2>

        <button
          type="button"
          className={buttonClass}
          disabled={loading}
          onClick={() => setReload((value) => value + 1)}
        >
          Refresh resume list
        </button>
      </div>

      <p className="mt-3 text-slate-600">
        Read visible text from PDF page images. Supports English
        resumes up to 5 pages and 5 MB. Processing may take around
        two minutes.
      </p>

      {error && (
        <p role="alert" className="mt-4 text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p role="status" className="mt-4">
          Loading resumes...
        </p>
      ) : resumes.length === 0 ? (
        <p className="mt-4 text-slate-600">
          Upload a resume above, then refresh this list.
        </p>
      ) : (
        <>
          <label
            htmlFor="ocr-resume"
            className="mt-5 block font-semibold"
          >
            Choose a resume
          </label>

          <select
            id="ocr-resume"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {resumes.map((resume) => (
              <option key={resume.id} value={resume.id}>
                {resume.originalName}
              </option>
            ))}
          </select>

          {selectedId && (
            <OcrResult key={selectedId} resumeId={selectedId} />
          )}
        </>
      )}
    </section>
  );
}

function OcrResult({ resumeId }: { resumeId: string }) {
  const [resume, setResume] = useState<OcrResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stopAt = Date.now() + 3 * 60 * 1000;

    setLoading(true);
    setError("");

    async function checkStatus() {
      try {
        const data = await authenticatedRequest<{
          resume: OcrResume;
        }>(`/api/resumes/${resumeId}/ocr`);

        if (!active) return;

        setResume(data.resume);
        setLoading(false);

        if (data.resume.ocrStatus === "PROCESSING") {
          if (Date.now() < stopAt) {
            timer = setTimeout(() => {
              void checkStatus();
            }, 3000);
          } else {
            setError(
              "Automatic checking stopped. Refresh status to check again.",
            );
          }
        }
      } catch (error) {
        if (!active) return;

        setLoading(false);
        setError(
          error instanceof Error
            ? error.message
            : "Could not retrieve OCR status.",
        );
      }
    }

    void checkStatus();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [resumeId, reload]);

  async function startOcr() {
    if (starting) return;

    setStarting(true);
    setError("");

    try {
      await authenticatedRequest<{
        resumeId: string;
        status: string;
      }>(`/api/resumes/${resumeId}/ocr`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      setReload((value) => value + 1);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not start OCR.",
      );
    } finally {
      setStarting(false);
    }
  }

  const processing = resume?.ocrStatus === "PROCESSING";

  const stale =
    processing &&
    (!resume.ocrStartedAt ||
      Date.now() - new Date(resume.ocrStartedAt).getTime() >
        3 * 60 * 1000);

  const completed = resume?.ocrStatus === "COMPLETED";

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={
            loading ||
            starting ||
            !resume ||
            completed ||
            (processing && !stale)
          }
          onClick={() => void startOcr()}
          className="rounded-xl bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {starting
            ? "Starting..."
            : completed
              ? "OCR complete"
              : processing && !stale
                ? "Reading PDF..."
                : "Run OCR"}
        </button>

        <button
          type="button"
          className={buttonClass}
          disabled={loading || starting}
          onClick={() => setReload((value) => value + 1)}
        >
          Refresh status
        </button>
      </div>

      {loading && (
        <p role="status" className="mt-4">
          Checking OCR status...
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 text-red-700">
          {error}
        </p>
      )}

      {resume && (
        <p role="status" className="mt-4 text-sm text-slate-600">
          Status: {resume.ocrStatus.replaceAll("_", " ")}
        </p>
      )}

      {processing && (
        <p className="mt-3 text-slate-600">
          {stale
            ? "This attempt appears interrupted. You can run OCR again."
            : "OCR is running. This panel checks progress automatically."}
        </p>
      )}

      {resume?.ocrStatus === "FAILED" && (
        <p role="alert" className="mt-3 text-red-700">
          {resume.ocrError || "OCR failed. Please try again."}
        </p>
      )}

      {resume?.ocrStatus === "NO_TEXT" && (
        <p className="mt-3 text-amber-800">
          OCR could not identify readable text. Try a clearer PDF.
        </p>
      )}

      {completed && resume && (
        <div className="mt-5">
          <p className="text-sm text-slate-600">
            Pages processed: {resume.ocrPageCount ?? "Unknown"}
            {resume.ocrConfidence !== null &&
              ` | OCR confidence: ${resume.ocrConfidence.toFixed(1)}%`}
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Confidence estimates text recognition quality. It is
            not your resume score or proof that the PDF has no
            hidden text.
          </p>

          <h3 className="mt-4 font-semibold">Recognized text</h3>

          <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm">
            {resume.ocrText}
          </pre>
          <ResumeIntegrity key={resumeId} resumeId={resumeId} />

        
        </div>
      )}
    </div>
  );
}