"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { authenticatedRequest } from "@/lib/api";

type ParseStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "NO_TEXT"
  | "FAILED";

type ResumeItem = {
  id: string;
  originalName: string;
  sizeBytes: number;
  createdAt: string;
  parseStatus: ParseStatus;
  pageCount: number | null;
  parseError: string | null;
};

type ResumeDetail = ResumeItem & {
  extractedText: string | null;
};

type AnalysisCheck = {
  id: string;
  label: string;
  earned: number;
  possible: number;
  explanation: string;
};

type ResumeAnalysis = {
  overallScore: number;
  wordCount: number;
  detectedSkills: string[];
  report: {
    checks: AnalysisCheck[];
    suggestions: string[];
    limitations: string[];
  };
};

const statusLabels: Record<ParseStatus, string> = {
  PENDING: "Ready to extract",
  PROCESSING: "Processing",
  COMPLETED: "Text extracted",
  NO_TEXT: "No embedded text",
  FAILED: "Extraction failed",
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function ResumeUpload() {
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [selected, setSelected] = useState<ResumeDetail | null>(null);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const actionRunning = useRef(false);
  const disabled = loading || busy !== "";

  useEffect(() => {
    let active = true;

    async function loadResumes() {
      try {
        const data = await authenticatedRequest<{
          resumes: ResumeItem[];
        }>("/api/resumes");

        if (active) {
          setResumes(data.resumes);
          setLoadError("");
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load your resumes.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadResumes();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  function refreshList() {
    setLoading(true);
    setLoadError("");
    setReloadKey((value) => value + 1);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (actionRunning.current || loading || loadError) {
      return;
    }

    setError("");
    setMessage("");
    setAnalysis(null);

    const form = event.currentTarget;
    const body = new FormData(form);
    const file = body.get("resume");

    if (!(file instanceof File) || file.size === 0) {
      setError("Please choose a non-empty PDF.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file.");
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setError("The PDF must be 5 MiB or smaller.");
      return;
    }

    actionRunning.current = true;
    setBusy("upload");

    try {
      const data = await authenticatedRequest<{
        resume: ResumeItem;
      }>("/api/resumes", {
        method: "POST",
        body,
      });

      setResumes((current) =>
        [
          data.resume,
          ...current.filter((item) => item.id !== data.resume.id),
        ].slice(0, 50),
      );

      form.reset();
      setSelected(null);
      setMessage("Resume uploaded. Click Extract text to process it.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Upload failed.",
      );
    } finally {
      actionRunning.current = false;
      setBusy("");
    }
  }

  async function handleResumeAction(
    resumeId: string,
    action: "parse" | "view",
  ) {
    if (actionRunning.current || loading) {
      return;
    }

    actionRunning.current = true;
    setBusy(`${action}:${resumeId}`);
    setError("");
    setMessage("");
    setSelected(null);
    setAnalysis(null);

    try {
      const path = `/api/resumes/${encodeURIComponent(resumeId)}`;

      const data =
        action === "parse"
          ? await authenticatedRequest<{ resume: ResumeDetail }>(
              `${path}/parse`,
              {
                method: "POST",
                body: JSON.stringify({}),
              },
            )
          : await authenticatedRequest<{ resume: ResumeDetail }>(path);

      setSelected(data.resume);

      setResumes((current) =>
        current.map((item) =>
          item.id === data.resume.id ? data.resume : item,
        ),
      );

      if (action === "parse") {
        setMessage(
          data.resume.parseStatus === "NO_TEXT"
            ? "No embedded text was found. This PDF may require OCR."
            : "Text extracted and saved successfully.",
        );
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not process this resume.",
      );

      refreshList();
    } finally {
      actionRunning.current = false;
      setBusy("");
    }
  }

  async function handleAnalyze(resumeId: string) {
    if (actionRunning.current || loading) {
      return;
    }

    actionRunning.current = true;
    setBusy(`analyze:${resumeId}`);
    setError("");
    setMessage("");
    setSelected(null);
    setAnalysis(null);

    try {
      const data = await authenticatedRequest<{
        analysis: ResumeAnalysis;
      }>(`/api/resumes/${encodeURIComponent(resumeId)}/analysis`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      setAnalysis(data.analysis);
      setMessage("Resume analysis completed and saved successfully.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Analysis failed.",
      );
    } finally {
      actionRunning.current = false;
      setBusy("");
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Your resumes</h2>

        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setError("");
            setMessage("");
            setSelected(null);
            setAnalysis(null);
            refreshList();
          }}
          className="rounded-xl border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          Refresh list
        </button>
      </header>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        Upload a PDF up to 5 MiB. Text extraction supports up to
        10 pages and 100,000 characters.
      </p>

      {(loadError || error) && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">
          {loadError || error}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-emerald-50 p-4 text-emerald-800"
        >
          {message}
        </p>
      )}

      <form onSubmit={handleUpload} className="mt-6">
        <fieldset
          disabled={disabled || Boolean(loadError)}
          className="flex flex-wrap items-end gap-4"
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="resume-file" className="block font-semibold">
              Choose your resume
            </label>

            <input
              id="resume-file"
              name="resume"
              type="file"
              accept=".pdf,application/pdf"
              required
              onChange={() => {
                setError("");
                setMessage("");
              }}
              className="mt-2 block w-full rounded-xl border border-slate-300 p-3 text-sm"
            />
          </div>

          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy === "upload" ? "Uploading..." : "Upload resume"}
          </button>
        </fieldset>
      </form>

      <h3 className="mt-8 text-lg font-semibold">Recent uploads</h3>

      {loading ? (
        <p role="status" className="mt-4 text-slate-600">
          Loading resumes...
        </p>
      ) : loadError ? (
        <p className="mt-4 text-slate-600">
          Click Refresh list to try again.
        </p>
      ) : resumes.length === 0 ? (
        <p className="mt-4 text-slate-600">
          You have not uploaded a resume yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {resumes.map((resume) => (
            <li
              key={resume.id}
              className="rounded-2xl border border-slate-200 p-5"
            >
              <p className="break-words font-semibold">
                {resume.originalName}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {Math.ceil(resume.sizeBytes / 1024)} KiB
                {" · "}
                {new Date(resume.createdAt).toLocaleDateString()}
                {resume.pageCount !== null &&
                  ` · ${resume.pageCount} page(s)`}
              </p>

              <p className="mt-2 text-sm font-semibold text-indigo-700">
                {busy === `parse:${resume.id}`
                  ? "Extracting text..."
                  : statusLabels[resume.parseStatus]}
              </p>

              {resume.parseError && (
                <p className="mt-2 text-sm text-red-700">
                  {resume.parseError}
                </p>
              )}

              {resume.parseStatus === "NO_TEXT" && (
                <p className="mt-2 text-sm text-slate-600">
                  This PDF may contain scanned images. OCR support
                  will be added in a later phase.
                </p>
              )}

              {resume.parseStatus === "PROCESSING" && (
                <p className="mt-2 text-sm text-slate-600">
                  Refresh to check progress. If processing was
                  interrupted, retry after one minute.
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={
                    disabled || resume.parseStatus === "COMPLETED"
                  }
                  onClick={() =>
                    void handleResumeAction(resume.id, "parse")
                  }
                  className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {busy === `parse:${resume.id}`
                    ? "Extracting..."
                    : resume.parseStatus === "FAILED" ||
                        resume.parseStatus === "PROCESSING"
                      ? "Retry extraction"
                      : "Extract text"}
                </button>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    void handleResumeAction(resume.id, "view")
                  }
                  className="rounded-xl border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  {busy === `view:${resume.id}`
                    ? "Loading..."
                    : "View text"}
                </button>

                <button
                  type="button"
                  disabled={
                    disabled || resume.parseStatus !== "COMPLETED"
                  }
                  onClick={() => void handleAnalyze(resume.id)}
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {busy === `analyze:${resume.id}`
                    ? "Analyzing..."
                    : "Analyze resume"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {analysis && (
        <section
          aria-label="Resume analysis"
          className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
        >
          <h3 className="text-xl font-bold text-emerald-950">
            Resume analysis
          </h3>

          <p className="mt-3 text-4xl font-bold text-emerald-700">
            {analysis.overallScore}/100
          </p>

          <p className="mt-1 text-sm text-emerald-900">
            Based on {analysis.wordCount} extracted words.
          </p>

          <h4 className="mt-6 font-bold text-emerald-950">
            Detected skills
          </h4>

          {analysis.detectedSkills.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {analysis.detectedSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-emerald-800"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-emerald-900">
              No recognized technical skills were detected.
            </p>
          )}

          <h4 className="mt-6 font-bold text-emerald-950">
            Score breakdown
          </h4>

          <ul className="mt-3 space-y-2">
            {analysis.report.checks.map((check) => (
              <li
                key={check.id}
                className="rounded-xl bg-white p-3 text-sm"
              >
                <div className="flex justify-between gap-3 font-semibold">
                  <span>{check.label}</span>
                  <span>
                    {check.earned}/{check.possible}
                  </span>
                </div>

                <p className="mt-1 text-slate-600">
                  {check.explanation}
                </p>
              </li>
            ))}
          </ul>

          {analysis.report.suggestions.length > 0 && (
            <>
              <h4 className="mt-6 font-bold text-emerald-950">
                Suggestions
              </h4>

              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-950">
                {analysis.report.suggestions.map((suggestion) => (
                  <li key={suggestion}>{suggestion}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {selected && (
        <section
          aria-label="Extracted resume text"
          className="mt-8 rounded-2xl border border-indigo-200 bg-indigo-50 p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-bold">Extracted text</h3>

              <p className="mt-1 break-words text-sm text-slate-600">
                {selected.originalName}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm"
            >
              Close
            </button>
          </div>

          {selected.parseStatus === "COMPLETED" ? (
            <pre className="mt-4 max-h-96 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-white p-4 font-mono text-sm leading-6 text-slate-800">
              {selected.extractedText}
            </pre>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-700">
              {selected.parseStatus === "NO_TEXT"
                ? "No embedded text was found. OCR may be required."
                : selected.parseStatus === "FAILED"
                  ? selected.parseError ||
                    "Extraction failed. Please retry."
                  : selected.parseStatus === "PROCESSING"
                    ? "Extraction is processing. Refresh the list shortly."
                    : "Click Extract text to process this resume first."}
            </p>
          )}
        </section>
      )}
    </section>
  );
}