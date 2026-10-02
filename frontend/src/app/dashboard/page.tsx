"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import type { Role } from "@/lib/api";

const roleLabels: Record<Role, string> = {
  CANDIDATE: "Candidate",
  RECRUITER: "Recruiter",
  ADMIN: "Administrator",
};

const nextSteps: Record<Role, string> = {
  CANDIDATE:
    "Your account is ready. Profile editing, resume uploads, and job matching will be added in the upcoming phases.",
  RECRUITER:
    "Your account is ready. Company profiles, job posting, and applicant management will be added in the upcoming phases.",
  ADMIN:
    "Your account is ready. Administration tools will be added in a later phase.",
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  async function handleLogout() {
    setBusy(true);
    setError("");

    try {
      await logout();
      router.replace("/login");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Logout failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p role="status">Checking your session…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <span className="text-lg font-bold">AI Resume Analyzer</span>
        <button
          onClick={handleLogout}
          disabled={busy}
          className="rounded-xl border border-slate-300 bg-white px-5 py-2 font-semibold hover:bg-slate-100 disabled:opacity-60"
        >
          {busy ? "Logging out…" : "Log out"}
        </button>
      </header>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}

      <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <span className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
          {roleLabels[user.role]} account
        </span>

        <h1 className="mt-6 text-3xl font-bold sm:text-4xl">
          Welcome, {user.name}
        </h1>
        <p className="mt-3 break-all text-slate-600">{user.email}</p>

        <div className="mt-8 rounded-2xl bg-emerald-50 p-5">
          <h2 className="font-semibold text-emerald-900">
            You are signed in
          </h2>
          <p className="mt-2 leading-7 text-emerald-900">
            {nextSteps[user.role]}
          </p>
        </div>
      </section>
    </main>
  );
}