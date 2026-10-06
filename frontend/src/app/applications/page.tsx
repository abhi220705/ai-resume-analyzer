"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { authenticatedRequest } from "@/lib/api";

type Status =
  | "SUBMITTED"
  | "REVIEWING"
  | "SHORTLISTED"
  | "REJECTED"
  | "HIRED"
  | "WITHDRAWN";

type Application = {
  id: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
  candidate: { id: string; name: string; email: string };
  job: {
    id: string;
    title: string;
    status: string;
    company: { id: string; name: string };
  };
  resume: { id: string; originalName: string };
};

type ApplicationDetail = Application & {
  coverLetter: string | null;
  resumeTextSnapshot: string;
};

type Resume = {
  id: string;
  originalName: string;
  parseStatus: string;
};

type Job = {
  id: string;
  title: string;
  company: { name: string };
};

const nextStatuses: Record<Status, Status[]> = {
  SUBMITTED: ["REVIEWING", "REJECTED"],
  REVIEWING: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["HIRED", "REJECTED"],
  REJECTED: [],
  HIRED: [],
  WITHDRAWN: [],
};

const buttonClass =
  "rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold hover:bg-slate-50 disabled:opacity-50";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3";

function label(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default function ApplicationsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p role="status">Checking your session...</p>
      </main>
    );
  }

  if (user.role === "ADMIN") {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <p>This page is for candidate and recruiter accounts.</p>
        <Link href="/dashboard" className="mt-4 block text-indigo-700">
          Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <ApplicationWorkspace
      key={user.id}
      candidate={user.role === "CANDIDATE"}
    />
  );
}

function ApplicationWorkspace({ candidate }: { candidate: boolean }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const actionRunning = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadApplications() {
      setLoading(true);
      setLoadError("");

      try {
        const endpoint = candidate ? "mine" : "received";
        const data = await authenticatedRequest<{
          applications: Application[];
          hasMore: boolean;
        }>(`/api/applications/${endpoint}?page=${page}`);

        if (active) {
          setApplications(data.applications);
          setHasMore(data.hasMore);
        }
      } catch (failure) {
        if (active) {
          setApplications([]);
          setHasMore(false);
          setLoadError(
            failure instanceof Error
              ? failure.message
              : "Could not load applications.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadApplications();
    return () => {
      active = false;
    };
  }, [candidate, page, reload]);

  function refresh() {
    setDetail(null);
    setLoading(true);
    setReload((value) => value + 1);
  }

  async function viewApplication(application: Application) {
    if (actionRunning.current) return;

    actionRunning.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    setDetail(null);

    try {
      const data = await authenticatedRequest<{
        application: ApplicationDetail;
      }>(`/api/applications/${encodeURIComponent(application.id)}`);

      setDetail(data.application);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not open application.",
      );
    } finally {
      actionRunning.current = false;
      setBusy(false);
    }
  }

  async function updateApplication(
    application: Application,
    status: Status | "withdraw",
  ) {
    if (actionRunning.current) return;

    actionRunning.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    setDetail(null);

    try {
      const withdrawing = status === "withdraw";

      await authenticatedRequest<{ application: Application }>(
        `/api/applications/${encodeURIComponent(application.id)}/${
          withdrawing ? "withdraw" : "status"
        }`,
        {
          method: withdrawing ? "POST" : "PATCH",
          body: JSON.stringify(
            withdrawing
              ? {}
              : { expectedStatus: application.status, status },
          ),
        },
      );

      setMessage(
        withdrawing ? "Application withdrawn." : "Application status updated.",
      );
      refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not update application.",
      );
      refresh();
    } finally {
      actionRunning.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <nav className="flex flex-wrap gap-5 font-semibold text-indigo-700">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/jobs">Jobs</Link>
        {candidate && <Link href="/matches">Resume matching</Link>}
      </nav>

      <h1 className="mt-8 text-3xl font-bold">
        {candidate ? "My applications" : "Received applications"}
      </h1>

      {candidate && (
        <ApplyForm
          onSubmitted={() => {
            setPage(1);
            refresh();
          }}
        />
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

      <button
        type="button"
        disabled={loading || busy}
        onClick={refresh}
        className={`${buttonClass} mt-6`}
      >
        Refresh applications
      </button>

      {loading ? (
        <p role="status" className="mt-5">Loading applications...</p>
      ) : loadError ? (
        <p role="alert" className="mt-5 text-red-700">
          {loadError} Use Refresh applications to retry.
        </p>
      ) : applications.length === 0 ? (
        <p className="mt-5 text-slate-600">No applications on this page.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {applications.map((application) => (
            <li
              key={application.id}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <h2 className="break-words text-lg font-bold">
                  {application.job.title}
                </h2>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
                  {label(application.status)}
                </span>
              </div>

              <p className="mt-2">{application.job.company.name}</p>
              {!candidate && (
                <p className="mt-2 break-words text-sm">
                  {application.candidate.name} — {application.candidate.email}
                </p>
              )}
              <p className="mt-2 break-words text-sm text-slate-600">
                Resume: {application.resume.originalName}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Applied: {new Date(application.createdAt).toLocaleDateString()}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                {(candidate || application.status !== "WITHDRAWN") && (
                  <button
                    type="button"
                    disabled={busy || loading}
                    onClick={() => void viewApplication(application)}
                    className={buttonClass}
                  >
                    View submitted resume
                  </button>
                )}

                {candidate && nextStatuses[application.status].length > 0 && (
                  <button
                    type="button"
                    disabled={busy || loading}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Withdraw this application? You cannot apply to this job again.",
                        )
                      ) {
                        void updateApplication(application, "withdraw");
                      }
                    }}
                    className={buttonClass}
                  >
                    Withdraw
                  </button>
                )}

                {!candidate &&
                  nextStatuses[application.status].map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={busy || loading}
                      onClick={() => {
                        if (
                          (status === "REJECTED" || status === "HIRED") &&
                          !window.confirm(`Mark this application as ${label(status)}?`)
                        ) {
                          return;
                        }
                        void updateApplication(application, status);
                      }}
                      className={buttonClass}
                    >
                      Mark {label(status)}
                    </button>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          disabled={loading || busy || page === 1}
          className={buttonClass}
          onClick={() => {
            setDetail(null);
            setLoading(true);
            setPage((value) => value - 1);
          }}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          type="button"
          disabled={loading || busy || !hasMore || page >= 9999}
          className={buttonClass}
          onClick={() => {
            setDetail(null);
            setLoading(true);
            setPage((value) => value + 1);
          }}
        >
          Next
        </button>
      </div>

      {detail && (
        <section className="mt-8 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Submitted application</h2>
              <p className="mt-2 break-words">
                {detail.candidate.name} — {detail.job.title}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDetail(null)}
              className={buttonClass}
            >
              Close
            </button>
          </div>

          {detail.coverLetter && (
            <>
              <h3 className="mt-5 font-bold">Cover letter</h3>
              <p className="mt-2 whitespace-pre-wrap break-words">
                {detail.coverLetter}
              </p>
            </>
          )}

          <h3 className="mt-5 font-bold">Resume text at submission</h3>
          <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-white p-4 text-sm leading-6">
            {detail.resumeTextSnapshot}
          </pre>
        </section>
      )}
    </main>
  );
}

function ApplyForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [jobId, setJobId] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const actionRunning = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadChoices() {
      setLoading(true);
      setLoadError("");
      setJobId("");

      try {
        const [resumeData, jobData] = await Promise.all([
          authenticatedRequest<{ resumes: Resume[] }>("/api/resumes"),
          authenticatedRequest<{ jobs: Job[]; hasMore: boolean }>(
            `/api/jobs?page=${page}`,
          ),
        ]);

        if (!active) return;

        const ready = resumeData.resumes.filter(
          (resume) => resume.parseStatus === "COMPLETED",
        );

        setResumes(ready);
        setResumeId((current) =>
          ready.some((resume) => resume.id === current) ? current : "",
        );
        setJobs(jobData.jobs);
        setHasMore(jobData.hasMore);
      } catch (failure) {
        if (active) {
          setJobs([]);
          setResumes([]);
          setHasMore(false);
          setResumeId("");
          setLoadError(
            failure instanceof Error ? failure.message : "Could not load choices.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadChoices();
    return () => {
      active = false;
    };
  }, [page, reload]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (actionRunning.current || loading || !resumeId || !jobId) return;

    actionRunning.current = true;
    setBusy(true);
    setError("");
    setMessage("");

    try {
      await authenticatedRequest<{ application: Application }>(
        "/api/applications",
        {
          method: "POST",
          body: JSON.stringify({
            resumeId,
            jobId,
            coverLetter: coverLetter.trim(),
          }),
        },
      );

      setMessage("Application submitted successfully.");
      setJobId("");
      setCoverLetter("");
      onSubmitted();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Could not submit application.",
      );
    } finally {
      actionRunning.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-bold">Apply to a job</h2>
      <p className="mt-2 text-sm text-slate-600">
        Submitting shares your name, email, cover letter, and selected resume
        text with the recruiter responsible for this job.
      </p>

      {(loadError || error) && (
        <p role="alert" className="mt-4 text-red-700">{loadError || error}</p>
      )}
      {message && (
        <p role="status" className="mt-4 text-emerald-700">{message}</p>
      )}

      <button
        type="button"
        disabled={loading || busy}
        className={`${buttonClass} mt-4`}
        onClick={() => {
          setLoading(true);
          setReload((value) => value + 1);
        }}
      >
        Refresh choices
      </button>

      {loading && <p role="status" className="mt-3">Loading choices...</p>}

      <form onSubmit={submit} className="mt-5">
        <fieldset disabled={loading || busy || Boolean(loadError)} className="space-y-5">
          <label className="block font-semibold">
            Resume
            <select
              required
              value={resumeId}
              onChange={(event) => setResumeId(event.target.value)}
              className={inputClass}
            >
              <option value="">Choose a parsed resume</option>
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.originalName}
                </option>
              ))}
            </select>
          </label>

          {!loading && !loadError && resumes.length === 0 && (
            <p className="text-sm text-slate-600">
              No parsed resume among your latest 50 uploads. Upload and extract
              your resume from the dashboard first.
            </p>
          )}

          <label className="block font-semibold">
            Published job
            <select
              required
              value={jobId}
              onChange={(event) => setJobId(event.target.value)}
              className={inputClass}
            >
              <option value="">Choose a job</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} — {job.company.name}
                </option>
              ))}
            </select>
          </label>

          {!loading && !loadError && jobs.length === 0 && (
            <p className="text-sm text-slate-600">
              No published jobs on this page.
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={loading || busy || page === 1}
              className={buttonClass}
              onClick={() => {
                setLoading(true);
                setPage((value) => value - 1);
              }}
            >
              Previous jobs
            </button>
            <span>Page {page}</span>
            <button
              type="button"
              disabled={loading || busy || !hasMore || page >= 9999}
              className={buttonClass}
              onClick={() => {
                setLoading(true);
                setPage((value) => value + 1);
              }}
            >
              Next jobs
            </button>
          </div>

          <label className="block font-semibold">
            Cover letter — optional
            <textarea
              value={coverLetter}
              onChange={(event) => setCoverLetter(event.target.value)}
              maxLength={3000}
              rows={5}
              className={inputClass}
              placeholder="Explain your interest and relevant experience."
            />
          </label>

          <button
            type="submit"
            disabled={loading || busy || !resumeId || !jobId}
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Submitting..." : "Submit application"}
          </button>
        </fieldset>
      </form>
    </section>
  );
}