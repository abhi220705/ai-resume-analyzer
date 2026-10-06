"use client";

import { useState } from "react";
import { authenticatedRequest } from "@/lib/api";

type Difference = {
  term: string;
  extraOccurrences: number;
};

type IntegrityReport = {
  engineVersion: string;
  score: number | null;
  status: "INSUFFICIENT_EVIDENCE" | "REVIEW_RECOMMENDED" | "CONSISTENT";
  comparisonConfidence: string;
  ocrConfidence: number | null;
  counts: {
    nativeTokens: number;
    ocrTokens: number;
    sharedOccurrences: number;
  };
  nativeExtraTerms: Difference[];
  ocrExtraTerms: Difference[];
  differencesTruncated: boolean;
  warnings: string[];
  explanation: string;
  thresholds: string;
  limitations: string[];
};

const statusLabels = {
  INSUFFICIENT_EVIDENCE: "Insufficient evidence",
  REVIEW_RECOMMENDED: "Manual review recommended",
  CONSISTENT: "Text sources are consistent",
};

export function ResumeIntegrity({ resumeId }: { resumeId: string }) {
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function compare() {
    if (busy) return;

    setBusy(true);
    setError("");
    setReport(null);

    try {
      const data = await authenticatedRequest<{
        report: IntegrityReport;
      }>(`/api/integrity/${resumeId}`);

      setReport(data.report);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to compare resume text.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 p-5">
      <h3 className="text-xl font-bold">Resume integrity comparison</h3>

      <p className="mt-2 text-sm text-slate-600">
        Compare extracted PDF text with OCR text from the same resume.
        Complete normal text extraction and OCR first.
      </p>

      <button
        type="button"
        disabled={busy}
        onClick={() => void compare()}
        className="mt-4 rounded-xl bg-indigo-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Comparing..." : "Check integrity"}
      </button>

      {busy && <p role="status" className="mt-3">Comparing text sources...</p>}

      {error && (
        <p role="alert" className="mt-4 text-red-700">
          {error}
        </p>
      )}

      {report && (
        <div className="mt-5 space-y-4">
          <div
            role="status"
            className={`rounded-xl p-4 ${
              report.status === "CONSISTENT"
                ? "bg-emerald-50 text-emerald-900"
                : "bg-amber-50 text-amber-900"
            }`}
          >
            <p className="text-2xl font-bold">
              {report.score === null
                ? "Score unavailable"
                : `Text agreement: ${report.score}/100`}
            </p>
            <p className="mt-2 font-semibold">
              {statusLabels[report.status]}
            </p>
          </div>

          <p className="text-sm text-slate-600">
            Comparison confidence: {report.comparisonConfidence}
            {" · "}OCR confidence:{" "}
            {report.ocrConfidence === null
              ? "Unavailable"
              : `${report.ocrConfidence.toFixed(1)}%`}
          </p>

          {report.warnings.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-amber-900">
              {report.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}

          {report.score !== null && (
            <div className="grid gap-4 sm:grid-cols-2">
              <DifferenceList
                title="Extra occurrences in PDF text"
                items={report.nativeExtraTerms}
              />
              <DifferenceList
                title="Extra occurrences in OCR text"
                items={report.ocrExtraTerms}
              />
            </div>
          )}

          {report.differencesTruncated && (
            <p className="text-sm text-slate-600">
              Showing up to 30 differing terms per source.
            </p>
          )}

          <details className="rounded-xl bg-slate-50 p-4">
            <summary className="cursor-pointer font-semibold">
              How this result was calculated
            </summary>
            <p className="mt-3">{report.explanation}</p>
            <p className="mt-3 text-sm">
              PDF tokens: {report.counts.nativeTokens}
              {" · "}OCR tokens: {report.counts.ocrTokens}
              {" · "}Shared occurrences: {report.counts.sharedOccurrences}
            </p>
            <p className="mt-3 text-sm">{report.thresholds}</p>
            <p className="mt-3 text-sm">Engine: {report.engineVersion}</p>
          </details>

          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            {report.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function DifferenceList({
  title,
  items,
}: {
  title: string;
  items: Difference[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <h4 className="font-semibold">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-2 text-sm">No extra occurrences found.</p>
      ) : (
        <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-sm">
          {items.map((item) => (
            <li key={item.term} className="break-all">
              {item.term}: +{item.extraOccurrences}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}