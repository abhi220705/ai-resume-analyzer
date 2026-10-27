"use client";

import { useRef, useState } from "react";
import { authenticatedRequest } from "@/lib/api";
import type { ResumeBuilderData } from "@/lib/resume-builder";

type Props = {
  resume: ResumeBuilderData;
  onChange: (resume: ResumeBuilderData) => void;
};

type Suggestion = {
  text: string;
  bullets: string[];
};

export function ResumeBuilderAi({ resume, onChange }: Props) {
  const [target, setTarget] = useState("summary");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    suggestion: Suggestion;
    fingerprint: string;
  } | null>(null);

  const running = useRef(false);

  const project = resume.projects.find(
    (entry) => target === `project:${entry.id}`,
  );

  const experience = resume.experience.find(
    (entry) => target === `experience:${entry.id}`,
  );

  const kind = target === "summary" ? "summary" : "bullets";

  // Contact fields and photos are deliberately excluded.
  const facts =
    target === "summary"
      ? {
          headline: resume.personal.headline,
          summary: resume.personal.summary,
          education: resume.education,
          projects: resume.projects.map((entry) => ({
            name: entry.name,
            role: entry.role,
            technologies: entry.technologies,
            bullets: entry.bullets,
          })),
          experience: resume.experience.map((entry) => ({
            company: entry.company,
            role: entry.role,
            currentlyWorking: entry.currentlyWorking,
            bullets: entry.bullets,
          })),
          skills: resume.skillGroups,
          achievements: resume.achievements,
        }
      : project
        ? {
            name: project.name,
            role: project.role,
            technologies: project.technologies,
            bullets: project.bullets,
          }
        : experience
          ? {
              company: experience.company,
              role: experience.role,
              currentlyWorking: experience.currentlyWorking,
              bullets: experience.bullets,
            }
          : null;

  const source = JSON.stringify(facts);
  const fingerprint = JSON.stringify({ target, source });
  const stale = Boolean(
    result && result.fingerprint !== fingerprint,
  );

  async function generate() {
    if (running.current || !consent) return;

    setError("");
    setResult(null);

    if (!facts) {
      setError("Select an existing section.");
      return;
    }

    if (
      kind === "bullets" &&
      !(project?.bullets ?? experience?.bullets ?? []).some(
        (bullet) => bullet.trim(),
      )
    ) {
      setError(
        "First write a few factual notes about your contribution. AI will improve their wording.",
      );
      return;
    }

    if (source.length > 8000) {
      setError(
        "There is too much text for one request. Shorten the details or choose an individual project or experience.",
      );
      return;
    }

    const requestFingerprint = fingerprint;
    running.current = true;
    setBusy(true);

    try {
      const response = await authenticatedRequest<{
        suggestion: Suggestion;
      }>("/api/resume-builder-ai", {
        method: "POST",
        body: JSON.stringify({
          kind,
          source,
          consent: true,
        }),
      });

      setResult({
        suggestion: response.suggestion,
        fingerprint: requestFingerprint,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate a suggestion.",
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  function accept() {
    if (!result || stale) return;

    if (target === "summary") {
      onChange({
        ...resume,
        personal: {
          ...resume.personal,
          summary: result.suggestion.text,
        },
      });
    } else if (project) {
      onChange({
        ...resume,
        projects: resume.projects.map((entry) =>
          entry.id === project.id
            ? { ...entry, bullets: [...result.suggestion.bullets] }
            : entry,
        ),
      });
    } else if (experience) {
      onChange({
        ...resume,
        experience: resume.experience.map((entry) =>
          entry.id === experience.id
            ? { ...entry, bullets: [...result.suggestion.bullets] }
            : entry,
        ),
      });
    }

    setResult(null);
  }

  return (
    <section
      className="mb-6 rounded-xl border border-teal-200 bg-teal-50 p-5"
      aria-labelledby="builder-ai-heading"
      aria-busy={busy}
    >
      <h2
        id="builder-ai-heading"
        className="text-lg font-semibold text-teal-950"
      >
        AI writing assistance
      </h2>

      <p className="mt-2 text-sm leading-6 text-teal-900">
        Add your facts first, then improve the wording. Review every
        suggestion for accuracy before accepting it.
      </p>

      <label className="mt-4 block text-sm font-semibold">
        Section to improve
        <select
          value={target}
          disabled={busy}
          onChange={(event) => {
            setTarget(event.target.value);
            setResult(null);
            setError("");
          }}
          className="mt-2 block w-full rounded-lg border border-teal-200 bg-white px-3 py-2.5 text-sm"
        >
          <option value="summary">Professional summary</option>

          {resume.projects.map((entry, index) => (
            <option
              key={entry.id}
              value={`project:${entry.id}`}
            >
              Project: {entry.name || `Project ${index + 1}`}
            </option>
          ))}

          {resume.experience.map((entry, index) => (
            <option
              key={entry.id}
              value={`experience:${entry.id}`}
            >
              Experience:{" "}
              {entry.company || entry.role || `Entry ${index + 1}`}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-4 flex items-start gap-3 text-sm leading-6">
        <input
          type="checkbox"
          checked={consent}
          disabled={busy}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-teal-800"
        />
        <span>
          I agree to send the relevant resume details to Groq for
          writing assistance. The summary uses my background
          sections; project and experience requests use only the
          selected entry. Photo and contact fields are excluded,
          but anything I type into descriptions may be included.
        </span>
      </label>

      <button
        type="button"
        disabled={!consent || busy}
        onClick={() => void generate()}
        className="ui-button ui-button-primary mt-4"
      >
        {busy ? "Writing suggestion..." : "Generate suggestion"}
      </button>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {result && (
        <div className="mt-5 rounded-xl border border-teal-200 bg-white p-4">
          <h3 className="font-semibold">Suggested wording</h3>

          {result.suggestion.text && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
              {result.suggestion.text}
            </p>
          )}

          {result.suggestion.bullets.length > 0 && (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
              {result.suggestion.bullets.map((bullet, index) => (
                <li key={index}>{bullet}</li>
              ))}
            </ul>
          )}

          {stale && (
            <p role="status" className="mt-3 text-sm text-amber-800">
              The source details changed. Generate a new suggestion
              before accepting.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={stale}
              onClick={accept}
              className="ui-button ui-button-primary"
            >
              Accept
            </button>

            <button
              type="button"
              onClick={() => setResult(null)}
              className="ui-button"
            >
              Dismiss
            </button>
          </div>

          <p className="mt-3 text-xs text-stone-500">
            Accept updates the editor. Click Save draft afterward
            to keep the changes.
          </p>
        </div>
      )}
    </section>
  );
}