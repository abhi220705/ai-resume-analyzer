"use client";

import Link from "next/link";
import { PageHeading } from "@/components/ui";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { authenticatedRequest } from "@/lib/api";
import { AdminManagement } from "@/components/admin-management";
import { AdminActivity } from "@/components/admin-activity";

type Stats = {
  users: number;
  candidates: number;
  recruiters: number;
  companies: number;
  verifiedCompanies: number;
  jobs: number;
  publishedJobs: number;
  applications: number;
  resumes: number;
};

const cards: { key: keyof Stats; label: string }[] = [
  { key: "users", label: "Total users" },
  { key: "candidates", label: "Candidates" },
  { key: "recruiters", label: "Recruiters" },
  { key: "companies", label: "Companies" },
  { key: "verifiedCompanies", label: "Verified companies" },
  { key: "jobs", label: "Total jobs" },
  { key: "publishedJobs", label: "Published jobs" },
  { key: "applications", label: "Applications" },
  { key: "resumes", label: "Uploaded resumes" },
];

export default function AdminPage() {
  const { user, loading, sessionError } = useAuth();

  if (loading) {
    return (
      <main className="p-8">
        <p role="status">Checking your session...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-8">
        <h1 className="text-2xl font-bold">Admin dashboard</h1>
        <p>{sessionError || "Log in with your administrator account."}</p>
        <Link href="/login" className="text-teal-700 underline">
          Go to login
        </Link>
      </main>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-8">
        <h1 className="text-2xl font-bold">Access restricted</h1>
        <p>This page is available only to administrators.</p>
        <Link href="/dashboard" className="text-teal-700 underline">
          Back to dashboard
        </Link>
      </main>
    );
  }

  return <AdminOverview key={user.id} name={user.name} />;
}

function AdminOverview({ name }: { name: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadStats() {
      setLoading(true);
      setError("");
      setStats(null);

      try {
        const data = await authenticatedRequest<{ stats: Stats }>(
          "/api/admin/stats",
        );

        if (active) setStats(data.stats);
      } catch (error) {
        if (active) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load platform statistics.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadStats();

    return () => {
      active = false;
    };
  }, [reload]);

  return (
    <main className="ui-page space-y-6">
      <PageHeading eyebrow="Administration" title="Platform overview" description={`Welcome, ${name}. Review activity and keep the platform organized.`} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-stone-600">
          Counts reflect stored records across the platform.
        </p>

        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setReload((value) => value + 1);
          }}
          className="ui-button ui-button-primary"
        >
          {loading ? "Loading..." : "Refresh statistics"}
        </button>
      </div>

      {loading ? (
        <p role="status">Loading platform statistics...</p>
      ) : error ? (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error} Use Refresh statistics to retry.
        </p>
      ) : stats ? (
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.key}
              className="ui-stat"
            >
              <dt className="font-medium text-stone-600">{card.label}</dt>
              <dd className="mt-3 text-4xl font-bold text-teal-700">
                {stats[card.key].toLocaleString()}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="ui-panel mt-8"><AdminManagement /></div>
      <div className="ui-panel mt-8"><AdminActivity /></div>

    </main>
  );
}