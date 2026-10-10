"use client";

import { useEffect, useState } from "react";
import { authenticatedRequest } from "@/lib/api";

type JobRow = {
  id: string;
  title: string;
  description: string;
  location: string;
  status: string;
  updatedAt: string;
  company: {
    name: string;
    verificationStatus: string;
  };
  createdBy: {
    name: string;
    email: string;
  };
  _count: { applications: number };
};

type ApplicationRow = {
  id: string;
  status: string;
  createdAt: string;
  candidate: {
    name: string;
    email: string;
  };
  job: {
    title: string;
    status: string;
    company: { name: string };
  };
};

type ListData = {
  jobs?: JobRow[];
  applications?: ApplicationRow[];
  page: number;
  hasMore: boolean;
};

type View = "jobs" | "applications";

const buttonClass =
  "ui-button";

export function AdminActivity() {
  const [view, setView] = useState<View>("jobs");

  return (
    <section className="space-y-5">
      <h2 className="text-2xl font-bold">Jobs and applications</h2>

      <div className="ui-segmented">
        {(["jobs", "applications"] as const).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={view === item}
            onClick={() => setView(item)}
            className={`${buttonClass} ${
              view === item ? "bg-teal-50 text-teal-800" : "bg-white"
            }`}
          >
            {item === "jobs" ? "Jobs" : "Applications"}
          </button>
        ))}
      </div>

      <ActivityList key={view} view={view} />
    </section>
  );
}

function ActivityList({ view }: { view: View }) {
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<ListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [closingId, setClosingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setData(null);
    setError("");

    void authenticatedRequest<ListData>(`/api/admin/${view}?page=${page}`)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((error: unknown) => {
        if (active) {
          setError(
            error instanceof Error ? error.message : "Unable to load records.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [view, page, reload]);

  async function closeJob(job: JobRow) {
    if (closingId) return;

    const confirmed = window.confirm(
      `Close "${job.title}"? It will disappear from candidate listings. Existing applications will remain.`,
    );

    if (!confirmed) return;

    setClosingId(job.id);
    setError("");
    setSuccess("");

    try {
      await authenticatedRequest(`/api/admin/jobs/${job.id}/close`, {
        method: "POST",
        body: JSON.stringify({
          expectedUpdatedAt: job.updatedAt,
        }),
      });

      setSuccess(
        `"${job.title}" was closed. Refresh the statistics above to update the totals.`,
      );
      setLoading(true);
      setReload((value) => value + 1);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to close the job.",
      );
    } finally {
      setClosingId("");
    }
  }

  function changePage(nextPage: number) {
    setLoading(true);
    setSuccess("");
    setPage(nextPage);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-stone-600">Page {page} · Up to 20 records</p>

        <button
          type="button"
          disabled={loading || Boolean(closingId)}
          className={buttonClass}
          onClick={() => {
            setLoading(true);
            setSuccess("");
            setReload((value) => value + 1);
          }}
        >
          Refresh list
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">
          {success}
        </p>
      )}

      {loading ? (
        <p role="status">Loading records...</p>
      ) : data ? (
        view === "jobs" ? (
          <div className="space-y-4">
            {!data.jobs?.length && <p>No jobs on this page.</p>}

            {data.jobs?.map((job) => (
              <article
                key={job.id}
                className="ui-panel"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <h3 className="text-xl font-bold">{job.title}</h3>
                  <span className="font-semibold text-teal-700">
                    {job.status}
                  </span>
                </div>

                <p className="mt-2">
                  {job.company.name} · {job.location}
                </p>

                <p className="mt-2 text-sm text-stone-600">
                  Company verification: {job.company.verificationStatus}
                </p>

                <p className="mt-2 break-all text-sm text-stone-600">
                  Posted by {job.createdBy.name} — {job.createdBy.email}
                </p>

                <p className="mt-2 text-sm">
                  Applications: {job._count.applications}
                </p>

                <details className="mt-4 rounded-lg bg-stone-50 p-3">
                  <summary className="cursor-pointer font-semibold">
                    Review job description
                  </summary>
                  <p className="mt-3 whitespace-pre-wrap break-words">
                    {job.description}
                  </p>
                </details>

                {job.status === "PUBLISHED" && (
                  <button
                    type="button"
                    disabled={Boolean(closingId)}
                    onClick={() => void closeJob(job)}
                    className="ui-button ui-button-danger mt-4"
                  >
                    {closingId === job.id ? "Closing..." : "Close job"}
                  </button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Platform applications</caption>
              <thead className="bg-stone-100">
                <tr>
                  {["Candidate", "Job", "Status", "Applied"].map((heading) => (
                    <th key={heading} scope="col" className="p-3">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.applications?.map((application) => (
                  <tr
                    key={application.id}
                    className="border-t border-stone-200"
                  >
                    <td className="p-3">
                      <p className="font-semibold">
                        {application.candidate.name}
                      </p>
                      <p className="break-all text-stone-600">
                        {application.candidate.email}
                      </p>
                    </td>
                    <td className="p-3">
                      <p>{application.job.title}</p>
                      <p className="text-stone-600">
                        {application.job.company.name}
                      </p>
                      <p className="text-xs text-stone-500">
                        Job: {application.job.status}
                      </p>
                    </td>
                    <td className="p-3">{application.status}</td>
                    <td className="whitespace-nowrap p-3">
                      {new Date(application.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}

                {!data.applications?.length && (
                  <tr>
                    <td colSpan={4} className="p-4">
                      No applications on this page.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      <div className="flex gap-3">
        <button
          type="button"
          disabled={loading || Boolean(closingId) || page === 1}
          onClick={() => changePage(page - 1)}
          className={buttonClass}
        >
          Previous
        </button>

        <button
          type="button"
          disabled={
            loading || Boolean(closingId) || !data?.hasMore || page >= 9999
          }
          onClick={() => changePage(page + 1)}
          className={buttonClass}
        >
          Next
        </button>
      </div>
    </div>
  );
}