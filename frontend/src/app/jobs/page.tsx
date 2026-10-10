"use client";

import Link from "next/link";
import { PageHeading, StatusBadge } from "@/components/ui";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { authenticatedRequest } from "@/lib/api";

type Job = {
  id: string;
  title: string;
  description: string;
  location: string;
  employmentType: "FULL_TIME" | "PART_TIME" | "INTERNSHIP" | "CONTRACT";
  workMode: "ON_SITE" | "HYBRID" | "REMOTE";
  minExperienceYears: number;
  requiredSkills: string[];
  preferredSkills: string[];
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  company: {
    id: string;
    name: string;
    website: string | null;
    industry: string | null;
    verificationStatus: string;
  };
};

type JobList = {
  jobs: Job[];
  page: number;
  hasMore: boolean;
};

const inputClass =
  "ui-input";

const buttonClass =
  "ui-button";

function readable(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

export default function JobsPage() {
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

  return (
    <JobWorkspace
      key={user.id}
      isRecruiter={user.role === "RECRUITER"}
    />
  );
}

function JobWorkspace({ isRecruiter }: { isRecruiter: boolean }) {
  const [mine, setMine] = useState(isRecruiter);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);
  const actionRunning = useRef(false);

  const disabled = loading || busy !== "";

  useEffect(() => {
    let active = true;

    async function loadJobs() {
      setLoading(true);
      setLoadError("");

      try {
        const params = new URLSearchParams({ page: String(page) });
        if (query) params.set("q", query);

        const endpoint = mine ? "/api/jobs/mine" : "/api/jobs";
        const result = await authenticatedRequest<JobList>(
          `${endpoint}?${params.toString()}`,
        );

        if (active) {
          setJobs(result.jobs);
          setHasMore(result.hasMore);
        }
      } catch (failure) {
        if (active) {
          setJobs([]);
          setHasMore(false);
          setLoadError(
            failure instanceof Error
              ? failure.message
              : "Could not load jobs.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadJobs();

    return () => {
      active = false;
    };
  }, [mine, page, query, reload]);

  function refreshJobs() {
    setLoading(true);
    setReload((value) => value + 1);
  }

  function switchView(showMine: boolean) {
    setLoading(true);
    setMine(showMine);
    setPage(1);
    setQuery("");
    setSearchInput("");
    setEditorOpen(false);
    setEditing(null);
    setError("");
    setMessage("");
    setReload((value) => value + 1);
  }

  function searchJobs(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;

    setLoading(true);
    setPage(1);
    setQuery(searchInput.trim());
    setReload((value) => value + 1);
  }

  async function saveJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (actionRunning.current) return;

    const fields = new FormData(event.currentTarget);
    const text = (name: string) => String(fields.get(name) ?? "").trim();

    const skills = (name: string) =>
      text(name)
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);

    const payload = {
      title: text("title"),
      description: text("description"),
      location: text("location"),
      employmentType: text("employmentType"),
      workMode: text("workMode"),
      minExperienceYears: Number(text("minExperienceYears")),
      requiredSkills: skills("requiredSkills"),
      preferredSkills: skills("preferredSkills"),
    };

    actionRunning.current = true;
    setBusy("save");
    setError("");
    setMessage("");

    try {
      const path = editing
        ? `/api/jobs/${encodeURIComponent(editing.id)}`
        : "/api/jobs";

      await authenticatedRequest<{ job: Job }>(path, {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      setMessage(editing ? "Job updated." : "Draft created. Publish it when ready.");
      setEditorOpen(false);
      setEditing(null);
      setPage(1);
      refreshJobs();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Could not save job.",
      );
    } finally {
      actionRunning.current = false;
      setBusy("");
    }
  }

  async function changeStatus(job: Job, action: "publish" | "close") {
    if (actionRunning.current || loading) return;

    actionRunning.current = true;
    setBusy(`${action}:${job.id}`);
    setError("");
    setMessage("");

    try {
      await authenticatedRequest<{ job: Job }>(
        `/api/jobs/${encodeURIComponent(job.id)}/${action}`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );

      setMessage(
        action === "publish"
          ? "Job published. Candidates can now find it."
          : "Job closed and removed from candidate listings.",
      );
      refreshJobs();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not change job status.",
      );
      refreshJobs();
    } finally {
      actionRunning.current = false;
      setBusy("");
    }
  }

  return (
    <main className="ui-page">
      <PageHeading eyebrow={mine ? "Recruiter workspace" : "Discover opportunities"} title={mine ? "Manage your jobs" : "Find your next opportunity"} description={mine ? "Draft, publish, and manage opportunities for your company." : "Explore roles, understand their requirements, and decide what comes next."}>
        {isRecruiter && <button type="button" disabled={disabled || editorOpen} onClick={() => switchView(!mine)} className={buttonClass}>{mine ? "Browse published jobs" : "Manage my jobs"}</button>}
      </PageHeading>
      {isRecruiter && mine && !editorOpen && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
            setError("");
            setMessage("");
          }}
          className="ui-button ui-button-primary mt-6"
        >
          Create job
        </button>
      )}

      {error && (
        <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}

      {message && (
        <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          {message}
        </p>
      )}

      {editorOpen && mine && (
        <section className="ui-panel mt-6">
          <h2 className="text-xl font-bold">
            {editing ? "Edit job" : "New job draft"}
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            Your company profile must exist before you can create a job.
          </p>

          <form
            key={editing?.id ?? "new"}
            onSubmit={saveJob}
            className="mt-5"
          >
            <fieldset disabled={busy !== ""} className="space-y-5">
              <label className="block font-semibold">
                Job title
                <input
                  name="title"
                  required
                  minLength={3}
                  maxLength={150}
                  defaultValue={editing?.title ?? ""}
                  placeholder="Junior Full Stack Developer"
                  className={inputClass}
                />
              </label>

              <label className="block font-semibold">
                Description
                <textarea
                  name="description"
                  required
                  minLength={50}
                  maxLength={5000}
                  rows={7}
                  defaultValue={editing?.description ?? ""}
                  placeholder="Describe the role, responsibilities, and qualifications."
                  className={inputClass}
                />
              </label>

              <label className="block font-semibold">
                Location or remote eligibility
                <input
                  name="location"
                  required
                  minLength={2}
                  maxLength={150}
                  defaultValue={editing?.location ?? ""}
                  placeholder="Mumbai, India or Remote within India"
                  className={inputClass}
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block font-semibold">
                  Employment type
                  <select
                    name="employmentType"
                    defaultValue={editing?.employmentType ?? "FULL_TIME"}
                    className={inputClass}
                  >
                    <option value="FULL_TIME">Full time</option>
                    <option value="PART_TIME">Part time</option>
                    <option value="INTERNSHIP">Internship</option>
                    <option value="CONTRACT">Contract</option>
                  </select>
                </label>

                <label className="block font-semibold">
                  Work mode
                  <select
                    name="workMode"
                    defaultValue={editing?.workMode ?? "ON_SITE"}
                    className={inputClass}
                  >
                    <option value="ON_SITE">On site</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="REMOTE">Remote</option>
                  </select>
                </label>
              </div>

              <label className="block font-semibold">
                Minimum experience in years
                <input
                  name="minExperienceYears"
                  type="number"
                  required
                  min={0}
                  max={50}
                  step={1}
                  defaultValue={editing?.minExperienceYears ?? 0}
                  className={inputClass}
                />
              </label>

              <label className="block font-semibold">
                Required skills, separated by commas
                <input
                  name="requiredSkills"
                  required
                  maxLength={1860}
                  defaultValue={editing?.requiredSkills.join(", ") ?? ""}
                  placeholder="JavaScript, React, PostgreSQL"
                  className={inputClass}
                />
              </label>

              <label className="block font-semibold">
                Preferred skills, separated by commas
                <input
                  name="preferredSkills"
                  maxLength={1860}
                  defaultValue={editing?.preferredSkills.join(", ") ?? ""}
                  placeholder="Docker, AWS"
                  className={inputClass}
                />
              </label>

              <p className="text-sm text-stone-600">
                Up to 30 skills per list, 60 characters per skill.
                Use different skills in the required and preferred lists.
              </p>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="ui-button ui-button-primary"
                >
                  {busy === "save"
                    ? "Saving..."
                    : editing
                      ? "Save changes"
                      : "Save draft"}
                </button>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => {
                    setEditorOpen(false);
                    setEditing(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </fieldset>
          </form>
        </section>
      )}

      <form onSubmit={searchJobs} className="ui-toolbar">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search jobs</span>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            maxLength={100}
            disabled={disabled || editorOpen}
            placeholder={
              mine ? "Search your job titles" : "Search title, company, or location"
            }
            className="ui-input w-full"
          />
        </label>
        <button
          type="submit"
          disabled={disabled || editorOpen}
          className={buttonClass}
        >
          Search
        </button>
        <button
          type="button"
          disabled={disabled || editorOpen}
          onClick={refreshJobs}
          className={buttonClass}
        >
          Refresh
        </button>
      </form>

      {loading ? (
        <p role="status" className="mt-6">Loading jobs...</p>
      ) : loadError ? (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
          {loadError} Use Refresh to try again.
        </p>
      ) : jobs.length === 0 ? (
        <p className="ui-empty">
          No jobs found on this page.
        </p>
      ) : (
        <ul className="jobs-grid">
          {jobs.map((job) => (
            <li key={job.id} className="job-card"><div className="company-monogram" aria-hidden="true">{job.company.name.slice(0, 1)}</div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="break-words text-xl font-bold">{job.title}</h2>
                  <p className="mt-1 break-words text-stone-600">
                    {job.company.name} | {job.location}
                  </p>
                </div>
                {mine && (
                  <StatusBadge value={job.status} />
                )}
              </div>

              <div className="job-meta"><span>{readable(job.employmentType)}</span><span>{readable(job.workMode)}</span><span>{job.minExperienceYears}+ years experience</span></div>

              <p className="mt-2 text-sm text-stone-600">
                Company verification: {readable(job.company.verificationStatus)}
              </p>

              <p className="ui-eyebrow mt-4">Required skills</p><div className="mt-2 flex flex-wrap gap-2">{job.requiredSkills.map((skill) => <span key={skill} className="ui-tag">{skill}</span>)}</div>
              {job.preferredSkills.length > 0 && (
                <p className="mt-2 break-words text-sm">
                  <strong>Preferred:</strong> {job.preferredSkills.join(", ")}
                </p>
              )}

              <details className="mt-4">
                <summary className="cursor-pointer font-semibold text-teal-700">
                  Read job description
                </summary>
                <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-stone-700">
                  {job.description}
                </p>
              </details>

              {mine && (
                <div className="mt-5 flex flex-wrap gap-3">
                  {job.status !== "CLOSED" && (
                    <button
                      type="button"
                      disabled={disabled || editorOpen}
                      className={buttonClass}
                      onClick={() => {
                        setEditing(job);
                        setEditorOpen(true);
                        setError("");
                        setMessage("");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Edit
                    </button>
                  )}
                  {job.status === "DRAFT" && (
                    <button
                      type="button"
                      disabled={disabled || editorOpen}
                      className={buttonClass}
                      onClick={() => void changeStatus(job, "publish")}
                    >
                      {busy === `publish:${job.id}` ? "Publishing..." : "Publish"}
                    </button>
                  )}
                  {job.status === "PUBLISHED" && (
                    <button
                      type="button"
                      disabled={disabled || editorOpen}
                      className={buttonClass}
                      onClick={() => void changeStatus(job, "close")}
                    >
                      {busy === `close:${job.id}` ? "Closing..." : "Close job"}
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="ui-pagination">
        <button
          type="button"
          disabled={disabled || editorOpen || page === 1}
          className={buttonClass}
          onClick={() => {
            setLoading(true);
            setPage((value) => value - 1);
          }}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          type="button"
          disabled={disabled || editorOpen || !hasMore || page >= 9999}
          className={buttonClass}
          onClick={() => {
            setLoading(true);
            setPage((value) => value + 1);
          }}
        >
          Next
        </button>
      </div>
    </main>
  );
}