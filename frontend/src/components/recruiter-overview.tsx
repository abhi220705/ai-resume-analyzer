"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authenticatedRequest } from "@/lib/api";

type RecruiterOverviewData = {
  stats: {
    totalJobs: number;
    publishedJobs: number;
    totalApplications: number;
    awaitingReview: number;
  };
  recentApplications: {
    id: string;
    status: string;
    createdAt: string;
    candidate: { name: string };
    job: { id: string; title: string };
  }[];
};

export function RecruiterOverview() {
  const [data, setData] = useState<RecruiterOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await authenticatedRequest<RecruiterOverviewData>(
          "/api/dashboard/recruiter",
        );

        if (active) setData(result);
      } catch (failure) {
        if (active) {
          setData(null);
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not load recruiter overview.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [reload]);

  const cards = data
    ? [
        { label: "Your jobs", value: data.stats.totalJobs },
        { label: "Published jobs", value: data.stats.publishedJobs },
        { label: "Applications received", value: data.stats.totalApplications },
        { label: "Awaiting review", value: data.stats.awaitingReview },
      ]
    : [];

  return (
    <section className="mt-8" aria-label="Recruiter overview">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Recruiter overview</h2>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setReload((value) => value + 1);
          }}
          className="ui-button"
        >
          {loading ? "Loading..." : "Refresh overview"}
        </button>
      </div>

      {loading ? (
        <p role="status" className="mt-4 text-stone-600">
          Loading jobs and applications...
        </p>
      ) : error ? (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">
          {error} Use Refresh overview to retry.
        </p>
      ) : data ? (
        <>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <div
                key={card.label}
                className="ui-stat"
              >
                <dt className="text-sm font-semibold text-stone-600">
                  {card.label}
                </dt>
                <dd className="mt-3 text-3xl font-bold">
                  {card.value}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-3 text-sm text-stone-600">
            Counts cover jobs you created in your current company.
            Awaiting review means Submitted. Refresh after changing jobs
            or application statuses.
          </p>

          {data.stats.totalJobs === 0 && (
            <p className="mt-4 rounded-xl bg-teal-50 p-4 text-teal-900">
              Set up your company profile, then use Manage jobs to create
              your first opportunity.
            </p>
          )}

          <section className="ui-panel mt-6">
            <div className="flex flex-wrap justify-between gap-3">
              <h3 className="text-xl font-bold">Recent applications</h3>
              <Link
                href="/applications"
                className="font-semibold text-teal-700"
              >
                Review applications
              </Link>
            </div>

            {data.recentApplications.length === 0 ? (
              <p className="mt-4 text-stone-600">
                No applications received yet.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-stone-200">
                {data.recentApplications.map((application) => (
                  <li key={application.id} className="py-4">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-semibold">
                          {application.candidate.name}
                        </p>
                        <p className="mt-1 break-words text-sm text-stone-600">
                          {application.job.title}
                        </p>
                      </div>
                      <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-700">
                        {application.status.charAt(0) +
                          application.status.slice(1).toLowerCase()}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-stone-500">
                      Applied{" "}
                      {new Date(application.createdAt).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}