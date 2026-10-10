"use client";

import { useEffect, useRef, useState } from "react";
import { authenticatedRequest } from "@/lib/api";
import { ResumeIntegrity } from "@/components/resume-integrity";
import { SelectField } from "@/components/select";

type ResumeOption = { id: string; originalName: string };
type OcrResume = {
  id: string;
  originalName: string;
  ocrStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "NO_TEXT" | "FAILED";
  ocrText: string | null;
  ocrPageCount: number | null;
  ocrConfidence: number | null;
  ocrError: string | null;
  ocrStartedAt: string | null;
  ocrCompletedAt: string | null;
};

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";
const buttonClass = "ui-button";
const statusLabels: Record<OcrResume["ocrStatus"], string> = {
  PENDING: "Ready to read", PROCESSING: "Reading PDF", COMPLETED: "OCR complete",
  NO_TEXT: "No readable text", FAILED: "OCR failed",
};

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
    void authenticatedRequest<{ resumes: ResumeOption[] }>("/api/resumes")
      .then((data) => {
        if (!active) return;
        setResumes(data.resumes);
        setSelectedId((current) => data.resumes.some((resume) => resume.id === current) ? current : (data.resumes[0]?.id ?? ""));
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load resumes.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  return (
    <section aria-label="Read resume with OCR" className="ui-panel mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Read resume with OCR</h2>
        <button type="button" className={buttonClass} disabled={loading} onClick={() => setReload((value) => value + 1)}>Refresh resume list</button>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">Read text from PDF page images. Supports English resumes up to 5 pages and 5 MiB. Processing may take around two minutes.</p>
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {loading ? (
        <p role="status" className="mt-5 text-sm text-stone-600">Loading resumes...</p>
      ) : error ? (
        <p className="mt-3 text-sm text-stone-600">Select Refresh resume list to try again.</p>
      ) : resumes.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-stone-300 p-5 text-sm text-stone-600">Upload a resume in the section above, then refresh this list.</p>
      ) : (
        <>
          <span id="ocr-resume-label" className="mt-5 block text-sm font-semibold">Choose a resume</span>
          <SelectField
            id="ocr-resume"
            labelledBy="ocr-resume-label"
            value={selectedId}
            onChange={setSelectedId}
            options={[
              { value: "", label: "Select a resume" },
              ...resumes.map((resume) => ({ value: resume.id, label: resume.originalName })),
            ]}
          />
          {selectedId && <OcrResult key={selectedId} resumeId={selectedId} />}
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
  const actionRunning = useRef(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stopAt = Date.now() + 3 * 60 * 1000;
    setLoading(true);
    setError("");

    async function checkStatus() {
      try {
        const data = await authenticatedRequest<{ resume: OcrResume }>(`/api/resumes/${encodeURIComponent(resumeId)}/ocr`);
        if (!active) return;
        setResume(data.resume);
        setLoading(false);
        if (data.resume.ocrStatus === "PROCESSING") {
          if (Date.now() < stopAt) {
            timer = setTimeout(() => { void checkStatus(); }, 3000);
          } else {
            setError("Automatic checking stopped. Refresh status to check again.");
          }
        }
      } catch (err) {
        if (!active) return;
        setLoading(false);
        setError(err instanceof Error ? err.message : "Could not retrieve OCR status.");
      }
    }
    void checkStatus();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [resumeId, reload]);

  const processing = resume?.ocrStatus === "PROCESSING";
  const startedAt = resume?.ocrStartedAt ? new Date(resume.ocrStartedAt).getTime() : NaN;
  const stale = processing && (!Number.isFinite(startedAt) || Date.now() - startedAt > 3 * 60 * 1000);
  const completed = resume?.ocrStatus === "COMPLETED";

  async function startOcr() {
    if (actionRunning.current || loading || !resume || completed || (processing && !stale)) return;
    actionRunning.current = true;
    setStarting(true);
    setError("");
    try {
      await authenticatedRequest<{ resumeId: string; status: string }>(`/api/resumes/${encodeURIComponent(resumeId)}/ocr`, { method: "POST", body: JSON.stringify({}) });
      setReload((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start OCR.");
    } finally {
      actionRunning.current = false;
      setStarting(false);
    }
  }

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={loading || starting || !resume || completed || (processing && !stale)} onClick={() => void startOcr()} className={`min-h-11 rounded-lg bg-teal-800 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50 ${focus}`}>
          {starting ? "Starting..." : completed ? "OCR complete" : processing && !stale ? "Reading PDF..." : "Run OCR"}
        </button>
        <button type="button" className={buttonClass} disabled={loading || starting} onClick={() => setReload((value) => value + 1)}>Refresh status</button>
      </div>
      {loading && <p role="status" className="mt-4 text-sm text-stone-600">Checking OCR status...</p>}
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {resume && <p role="status" className="mt-4 text-sm font-semibold text-stone-700">Status: {statusLabels[resume.ocrStatus]}</p>}
      {processing && <p className="mt-2 text-sm leading-6 text-stone-600">{stale ? "This attempt may have been interrupted. You can try running OCR again." : "OCR is running. This panel checks progress automatically."}</p>}
      {resume?.ocrStatus === "FAILED" && <p role="alert" className="mt-3 text-sm text-red-800">{resume.ocrError || "OCR failed. Please try again."}</p>}
      {resume?.ocrStatus === "NO_TEXT" && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">OCR could not identify readable text. Try a clearer PDF.</p>}
      {completed && resume && (
        <div className="mt-6 border-t border-stone-200 pt-5">
          <dl className="flex flex-wrap gap-x-10 gap-y-4">
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">Pages processed</dt><dd className="mt-1 text-2xl font-semibold">{resume.ocrPageCount ?? "Unknown"}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">OCR confidence</dt><dd className="mt-1 text-2xl font-semibold">{resume.ocrConfidence !== null && Number.isFinite(resume.ocrConfidence) ? `${resume.ocrConfidence.toFixed(1)}%` : "Unavailable"}</dd></div>
          </dl>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">Confidence estimates text recognition quality. It is not your resume score or proof that the PDF has no hidden text.</p>
          <h3 className="mt-5 font-semibold">Recognized text</h3>
          <pre tabIndex={0} aria-label="Recognized resume text" className={`mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-stone-200 bg-stone-50 p-4 font-mono text-sm leading-6 ${focus}`}>{resume.ocrText}</pre>
          <ResumeIntegrity key={resumeId} resumeId={resumeId} />
        </div>
      )}
    </div>
  );
}
