"use client";

import { useState } from "react";

type Connection = "idle" | "checking" | "connected" | "failed";

export default function Home() {
  const [connection, setConnection] = useState<Connection>("idle");
  const messages: Record<Connection, string> = {
    idle: "Ready to check your backend connection.",
    checking: "Checking the API…",
    connected: "Backend connected. Your development setup is ready.",
    failed: "Could not connect. Start the backend on port 4000 and check your environment files.",
  };

  async function checkConnection() {
    setConnection("checking");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("Missing API URL");
      const response = await fetch(`${apiUrl.replace(/\/$/, "")}/api/health`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Health check failed");
      const result = await response.json();
      if (result.success !== true || result.data?.status !== "ok") {
        throw new Error("Unexpected health response");
      }
      setConnection("connected");
    } catch {
      setConnection("failed");
    } finally {
      clearTimeout(timeout);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-12">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <p className="mb-5 text-sm font-bold tracking-widest text-indigo-600">PHASE 01 · DEVELOPMENT SETUP</p>
        <h1 className="text-3xl font-bold leading-tight sm:text-5xl">AI Resume Analyzer<br />& Job Match Platform</h1>
        <p className="mt-6 max-w-xl leading-7 text-slate-600">Our foundation for explainable resume analysis, job matching, and application tracking.</p>
        <div className="mt-8 flex flex-wrap gap-2 text-sm">
          {["Next.js + TypeScript", "Express API", "Three-member team"].map((label) => (
            <span key={label} className="rounded-full bg-slate-100 px-4 py-2">{label}</span>
          ))}
        </div>
        <div className="mt-10 border-t border-slate-200 pt-8">
          <button onClick={checkConnection} disabled={connection === "checking"} className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 disabled:opacity-60">
            {connection === "checking" ? "Checking…" : "Check backend connection"}
          </button>
          <p role="status" aria-live="polite" className={`mt-4 text-sm ${connection === "failed" ? "text-red-700" : connection === "connected" ? "text-emerald-700" : "text-slate-600"}`}>
            {messages[connection]}
          </p>
        </div>
      </section>
    </main>
  );
}
