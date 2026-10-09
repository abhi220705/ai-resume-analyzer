"use client";

import Link from "next/link";
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
        <Link href="/login" className="text-indigo-700 underline">
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
        <Link href="/dashboard" className="text-indigo-700 underline">
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
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-indigo-700">Administration</p>
          <h1 className="mt-2 text-3xl font-bold">Platform overview</h1>
          <p className="mt-2 text-slate-600">Welcome, {name}.</p>
        </div>

        <Link
          href="/dashboard"
          className="rounded-xl border border-slate-300 px-5 py-2 font-semibold"
        >
          Back to dashboard
        </Link>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-slate-600">
          Counts reflect stored records across the platform.
        </p>

        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setReload((value) => value + 1);
          }}
          className="rounded-xl bg-indigo-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
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
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.key}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <dt className="font-medium text-slate-600">{card.label}</dt>
              <dd className="mt-3 text-4xl font-bold text-indigo-700">
                {stats[card.key].toLocaleString()}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <AdminManagement />
      <AdminActivity />

    </main>
  );
}