"use client";

import { useRef, useState } from "react";
import { authenticatedRequest } from "@/lib/api";

type Feedback = {
  summary: string;
  strengths: string[];
  improvements: {
    evidence: string;
    suggestion: string;
  }[];
};

type FeedbackResponse = {
  feedback: Feedback | null;
  cached?: boolean;
  needsAnalysis?: boolean;
};

export function ResumeAiFeedback({
  resumeId,
  disabled = false,
}: {
  resumeId: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState("");
  const running = useRef(false);

  async function loadFeedback(generate: boolean) {
    if (disabled || running.current || (generate && !consent)) return;

    running.current = true;
    setBusy(true);
    setError("");
    setOpen(true);

    try {
      const path =
        `/api/resumes/${encodeURIComponent(resumeId)}/ai-feedback`;

      const data = await authenticatedRequest<FeedbackResponse>(
        path,
        generate
          ? {
              method: "POST",
              body: JSON.stringify({ consent: true }),
            }
          : { method: "GET" },
      );

      setFeedback(data.feedback);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not load AI feedback.",
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        className="ui-button"
        disabled={disabled || busy}
        aria-expanded={open}
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            void loadFeedback(false);
          }
        }}
      >
        {busy ? "Please wait..." : open ? "Hide AI feedback" : "AI feedback"}
      </button>

      {open && (
        <section
          aria-label="AI resume feedback"
          aria-busy={busy}
          className="ui-panel resume-result mt-4"
        >
          <h4 className="text-lg font-bold">AI resume feedback</h4>

          <p className="mt-2 text-sm">
            AI suggestions may contain mistakes. Verify every claim before
            editing your resume. This feedback is not a hiring score.
          </p>

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {busy && (
            <p role="status" className="mt-3 text-sm">
              {feedback ? "Loading..." : "Preparing your feedback..."}
            </p>
          )}

          {!feedback && !busy && (
            <div className="mt-4">
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={consent}
                  disabled={disabled}
                  onChange={(event) => setConsent(event.target.checked)}
                  className="mt-1"
                />
                <span>
                  I agree to send my extracted resume text, including any
                  personal details it contains, to Groq for AI feedback.
                </span>
              </label>

              <button
                type="button"
                className="ui-button ui-button-primary mt-4"
                disabled={disabled || !consent}
                onClick={() => void loadFeedback(true)}
              >
                Analyze with AI
              </button>
            </div>
          )}

          {feedback && (
            <div className="mt-4 space-y-5">
              <div>
                <h5 className="font-semibold">Summary</h5>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                  {feedback.summary}
                </p>
              </div>

              {feedback.strengths.length > 0 && (
                <div>
                  <h5 className="font-semibold">Strengths</h5>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
                    {feedback.strengths.map((strength, index) => (
                      <li key={index} className="break-words">
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h5 className="font-semibold">Suggested improvements</h5>
                <ul className="mt-2 space-y-4">
                  {feedback.improvements.map((item, index) => (
                    <li key={index} className="border-t border-stone-200 pt-3">
                      <p className="text-xs font-semibold">From your resume</p>
                      <blockquote className="mt-1 whitespace-pre-wrap break-words border-l-2 border-teal-600 pl-3 text-sm">
                        {item.evidence}
                      </blockquote>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                        {item.suggestion}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}