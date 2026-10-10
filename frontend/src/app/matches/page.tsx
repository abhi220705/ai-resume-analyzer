"use client";

import Link from "next/link";
import { PageHeading, Icon } from "@/components/ui";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { authenticatedRequest } from "@/lib/api";

type Resume = {
  id: string;
  originalName: string;
  parseStatus: string;
};

type Job = {
  id: string;
  title: string;
  location: string;
  company: {
    name: string;
  };
};

type MatchResult = {
  resume: {
    id: string;
    originalName: string;
  };
  job: {
    id: string;
    title: string;
    company: {
      id: string;
      name: string;
    };
  };
  match: {
    score: number;
    matchedRequired: string[];
    missingRequired: string[];
    matchedPreferred: string[];
    missingPreferred: string[];
    explanation: string;
    limitations: string[];
    breakdown: {
      required: {
        matched: number;
        total: number;
        weight: number;
        points: number;
      };
      preferred: {
        matched: number;
        total: number;
        weight: number;
        points: number;
      };
    };
  };
  otherRequirements: {
    minExperienceYears: number;
    location: string;
    workMode: string;
    assessed: boolean;
  };
};

const buttonClass =
  "ui-button";

export default function MatchesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="ui-empty">
        <p role="status">Checking your session...</p>
      </main>
    );
  }

  if (user.role !== "CANDIDATE") {
    return (
      <main className="ui-page">
        <h1 className="text-2xl font-bold">Candidate feature</h1>
        <p className="mt-3">
          Resume matching is available to candidate accounts.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block font-semibold text-teal-700"
        >
          Back to dashboard
        </Link>
      </main>
    );
  }

  return <MatchingWorkspace key={user.id} />;
}

function SkillList({
  title,
  skills,
  emptyMessage,
}: {
  title: string;
  skills: string[];
  emptyMessage: string;
}) {
  return (
    <section className="ui-panel">
      <h3 className="font-bold">{title}</h3>
      {skills.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {skills.map((skill) => (
            <li
              key={skill}
              className="rounded-full bg-stone-100 px-3 py-1 text-sm"
            >
              {skill}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-stone-600">{emptyMessage}</p>
      )}
    </section>
  );
}

function MatchingWorkspace() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [jobId, setJobId] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [reload, setReload] = useState(0);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [resumeError, setResumeError] = useState("");
  const [jobError, setJobError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const actionRunning = useRef(false);

  const disabled = busy || loadingResumes || loadingJobs;

  useEffect(() => {
    let active = true;

    async function loadResumes() {
      setLoadingResumes(true);
      setResumeError("");

      try {
        const data = await authenticatedRequest<{ resumes: Resume[] }>(
          "/api/resumes",
        );

        if (!active) return;

        const ready = data.resumes.filter(
          (resume) => resume.parseStatus === "COMPLETED",
        );

        setResumes(ready);
        setResumeId((current) =>
          ready.some((resume) => resume.id === current) ? current : "",
        );
      } catch (failure) {
        if (active) {
          setResumes([]);
          setResumeId("");
          setResumeError(
            failure instanceof Error
              ? failure.message
              : "Could not load resumes.",
          );
        }
      } finally {
        if (active) setLoadingResumes(false);
      }
    }

    void loadResumes();

    return () => {
      active = false;
    };
  }, [reload]);

  useEffect(() => {
    let active = true;

    async function loadJobs() {
      setLoadingJobs(true);
      setJobError("");
      setJobId("");
      setResult(null);

      try {
        const params = new URLSearchParams({ page: String(page) });
        if (query) params.set("q", query);

        const data = await authenticatedRequest<{
          jobs: Job[];
          hasMore: boolean;
        }>(`/api/jobs?${params.toString()}`);

        if (active) {
          setJobs(data.jobs);
          setHasMore(data.hasMore);
        }
      } catch (failure) {
        if (active) {
          setJobs([]);
          setHasMore(false);
          setJobError(
            failure instanceof Error
              ? failure.message
              : "Could not load jobs.",
          );
        }
      } finally {
        if (active) setLoadingJobs(false);
      }
    }

    void loadJobs();

    return () => {
      active = false;
    };
  }, [page, query, reload]);

  function searchJobs(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;

    setLoadingJobs(true);
    setLoadingResumes(true);
    setResult(null);
    setError("");
    setPage(1);
    setQuery(searchInput.trim());
    setReload((value) => value + 1);
  }

  async function compareResume(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (actionRunning.current || disabled || !resumeId || !jobId) {
      return;
    }

    actionRunning.current = true;
    setBusy(true);
    setError("");
    setResult(null);

    try {
      const data = await authenticatedRequest<MatchResult>("/api/matches", {
        method: "POST",
        body: JSON.stringify({ resumeId, jobId }),
      });

      setResult(data);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not calculate the match.",
      );
    } finally {
      actionRunning.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="ui-page">
      <PageHeading eyebrow="Understand the overlap" title="Match your skills to the role" description="Compare skill mentions in your resume with a published job. See what matches and what needs a closer look." />
      <button
        type="button"
        disabled={disabled}
        className={`${buttonClass} mt-5`}
        onClick={() => {
          setLoadingResumes(true);
          setLoadingJobs(true);
          setError("");
          setResult(null);
          setReload((value) => value + 1);
        }}
      >
        Refresh resumes and jobs
      </button>

      {(resumeError || jobError || error) && (
        <div role="alert" className="mt-5 space-y-2 rounded-xl bg-red-50 p-4 text-red-700">
          {resumeError && <p>{resumeError}</p>}
          {jobError && <p>{jobError}</p>}
          {error && <p>{error}</p>}
        </div>
      )}

      <form onSubmit={searchJobs} className="ui-toolbar">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search jobs</span>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            disabled={disabled}
            maxLength={100}
            placeholder="Search job title, company, or location"
            className="ui-input w-full"
          />
        </label>
        <button type="submit" disabled={disabled} className={buttonClass}>
          Search jobs
        </button>
      </form>

      <div className="matching-layout"><form
        onSubmit={compareResume}
        className="mt-6 rounded-xl border border-stone-200 bg-white p-6"
      >
        <fieldset disabled={disabled} className="space-y-6">
          <label className="block font-semibold">
            Choose a parsed resume
            <select
              required
              value={resumeId}
              onChange={(event) => {
                setResumeId(event.target.value);
                setResult(null);
                setError("");
              }}
              className="ui-input mt-2 w-full"
            >
              <option value="">
                {loadingResumes ? "Loading resumes..." : "Select a resume"}
              </option>
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.originalName}
                </option>
              ))}
            </select>
          </label>

          {!loadingResumes && !resumeError && resumes.length === 0 && (
            <p className="text-sm text-stone-600">
              No parsed resumes were found among your latest 50 uploads.
              Open the dashboard, upload a resume, and click Extract text.
            </p>
          )}

          <label className="block font-semibold">
            Choose a published job
            <select
              required
              value={jobId}
              onChange={(event) => {
                setJobId(event.target.value);
                setResult(null);
                setError("");
              }}
              className="ui-input mt-2 w-full"
            >
              <option value="">
                {loadingJobs ? "Loading jobs..." : "Select a job"}
              </option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} — {job.company.name} — {job.location}
                </option>
              ))}
            </select>
          </label>

          {!loadingJobs && !jobError && jobs.length === 0 && (
            <p className="text-sm text-stone-600">
              No published jobs found on this page. Try another search.
            </p>
          )}

          <div className="ui-pagination">
            <button
              type="button"
              disabled={disabled || page === 1}
              className={buttonClass}
              onClick={() => {
                setLoadingJobs(true);
                setResult(null);
                setPage((value) => value - 1);
              }}
            >
              Previous jobs
            </button>
            <span>Page {page}</span>
            <button
              type="button"
              disabled={disabled || !hasMore || page >= 9999}
              className={buttonClass}
              onClick={() => {
                setLoadingJobs(true);
                setResult(null);
                setPage((value) => value + 1);
              }}
            >
              Next jobs
            </button>
          </div>

          <button
            type="submit"
            disabled={disabled || !resumeId || !jobId || Boolean(resumeError || jobError)}
            className="ui-button ui-button-primary"
          >
            {busy ? "Comparing..." : "Calculate skill match"}
          </button>
        </fieldset>
      </form>
      <aside className="matching-guide"><Icon name="match" /><h2>A comparison you can understand.</h2><p>Skill mentions help you explore a role. They do not measure proficiency or predict hiring outcomes.</p><ol><li><span>1</span>Choose a resume with extracted text.</li><li><span>2</span>Select a published opportunity.</li><li><span>3</span>Review required and preferred skill coverage.</li></ol><p>Check experience, location, and other requirements separately.</p></aside></div>

      {busy && <p role="status" className="mt-4">Calculating your match...</p>}

      {result && (
        <section
          aria-label="Skill match result"
          className="ui-panel mt-8"
        >
          <h2 className="text-2xl font-bold">Skill match result</h2>
          <p className="mt-2 break-words text-stone-700">
            {result.resume.originalName}
          </p>
          <p className="mt-1 break-words font-semibold">
            {result.job.title} at {result.job.company.name}
          </p>

          <div className="score-overview"><div className="score-ring"><div><strong>{result.match.score}</strong><small>out of 100</small></div></div><div className="min-w-0 flex-1"><h3>Skill coverage score</h3><p className="mt-2 text-sm text-stone-600">{result.match.explanation}</p><p className="mt-2 text-xs text-stone-600">This is not a hiring probability or proof of candidate suitability.</p></div></div>

          <div className="mt-5 rounded-xl bg-white p-4 text-sm">
            <p>
              Required: {result.match.breakdown.required.matched}/
              {result.match.breakdown.required.total} skills detected
              {" — "}
              {result.match.breakdown.required.points}/
              {result.match.breakdown.required.weight} points
            </p>
            <p className="mt-2">
              Preferred: {result.match.breakdown.preferred.matched}/
              {result.match.breakdown.preferred.total} skills detected
              {" — "}
              {result.match.breakdown.preferred.points}/
              {result.match.breakdown.preferred.weight} points
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <SkillList
              title="Required skills detected"
              skills={result.match.matchedRequired}
              emptyMessage="No required skills detected."
            />
            <SkillList
              title="Required skills not detected"
              skills={result.match.missingRequired}
              emptyMessage="All listed required skills were detected."
            />
            <SkillList
              title="Preferred skills detected"
              skills={result.match.matchedPreferred}
              emptyMessage="No preferred skills detected."
            />
            <SkillList
              title="Preferred skills not detected"
              skills={result.match.missingPreferred}
              emptyMessage="No unmatched preferred skills."
            />
          </div>

          <section className="mt-5 rounded-xl bg-white p-4">
            <h3 className="font-bold">Other requirements — check separately</h3>
            <p className="mt-2 text-sm">
              Minimum experience: {result.otherRequirements.minExperienceYears} years
            </p>
            <p className="mt-1 text-sm">
              Location: {result.otherRequirements.location}
            </p>
            <p className="mt-1 text-sm">
              Work mode: {result.otherRequirements.workMode.toLowerCase().replaceAll("_", " ")}
            </p>
            <p className="mt-2 text-sm text-stone-600">
              These requirements were not assessed by this skill comparison.
            </p>
          </section>

          <details className="mt-5 text-sm text-stone-700">
            <summary className="cursor-pointer font-semibold">
              How to interpret this score
            </summary>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              {result.match.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </main>
  );
}