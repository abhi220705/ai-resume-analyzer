"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { apiRequest } from "@/lib/api";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 " +
  "outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { user, loading, sessionError, login } = useAuth();

  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  const isRegister = mode === "register" && !registered;

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = event.currentTarget;
    const fields = new FormData(form);
    const password = String(fields.get("password") ?? "");
    const normalizedEmail = email.trim().toLowerCase();

    setError("");

    if (new TextEncoder().encode(password).length > 72) {
      setError("Password must not exceed 72 UTF-8 bytes.");
      return;
    }

    if (isRegister) {
      const name = String(fields.get("name") ?? "").trim();
      const confirmation = String(fields.get("confirmPassword") ?? "");

      if (name.length < 2) {
        setError("Name must contain at least 2 characters.");
        return;
      }

      if (password.length < 12) {
        setError("Password must contain at least 12 characters.");
        return;
      }

      if (password !== confirmation) {
        setError("The passwords do not match.");
        return;
      }
    }

    setBusy(true);

    try {
      if (isRegister) {
        await apiRequest("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({
            name: String(fields.get("name") ?? "").trim(),
            email: normalizedEmail,
            password,
            role: String(fields.get("role") ?? "CANDIDATE"),
          }),
        });

        form.reset();
        setEmail(normalizedEmail);
        setRegistered(true);
      } else {
        await login(normalizedEmail, password);
        router.replace("/dashboard");
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading || user) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p role="status">Checking your session…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Link href="/" className="font-semibold text-indigo-700">
        ← AI Resume Analyzer
      </Link>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-indigo-600">
          YOUR NEXT OPPORTUNITY
        </p>

        <h1 className="mt-3 text-3xl font-bold">
          {isRegister ? "Create your account" : "Welcome back"}
        </h1>

        <p className="mt-3 text-slate-600">
          {isRegister
            ? "Join as a candidate or recruiter."
            : "Sign in to continue to your account."}
        </p>

        {registered && (
          <p
            role="status"
            className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800"
          >
            Account created successfully. Log in below.
          </p>
        )}

        {sessionError && (
          <p role="status" className="mt-4 text-sm text-amber-800">
            {sessionError}
          </p>
        )}

        {error && (
          <p
            id="form-error"
            role="alert"
            className="mt-5 rounded-xl bg-red-50 p-4 text-red-700"
          >
            {error}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          aria-describedby={error ? "form-error" : undefined}
          className="mt-6"
        >
          <fieldset disabled={busy} className="space-y-5">
            {isRegister && (
              <div>
                <label htmlFor="name" className="text-sm font-semibold">
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="text-sm font-semibold">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
              />
            </div>

            {isRegister && (
              <div>
                <label htmlFor="role" className="text-sm font-semibold">
                  Account type
                </label>
                <select
                  id="role"
                  name="role"
                  defaultValue="CANDIDATE"
                  className={inputClass}
                >
                  <option value="CANDIDATE">Candidate — looking for jobs</option>
                  <option value="RECRUITER">Recruiter — hiring candidates</option>
                </select>
              </div>
            )}

            <div>
              <label htmlFor="password" className="text-sm font-semibold">
                Password
              </label>
              <input
                key={isRegister ? "new-password" : "login-password"}
                id="password"
                name="password"
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
                minLength={isRegister ? 12 : 1}
                aria-describedby={isRegister ? "password-help" : undefined}
                className={inputClass}
              />
              {isRegister && (
                <p id="password-help" className="mt-2 text-xs text-slate-500">
                  At least 12 characters; maximum 72 UTF-8 bytes.
                </p>
              )}
            </div>

            {isRegister && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-semibold"
                >
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className={inputClass}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 disabled:opacity-60"
            >
              {busy
                ? "Please wait…"
                : isRegister
                  ? "Create account"
                  : "Log in"}
            </button>
          </fieldset>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          {isRegister ? "Already have an account? " : "New here? "}
          <Link
            href={isRegister ? "/login" : "/register"}
            onClick={() => {
              setRegistered(false);
              setError("");
            }}
            className="font-semibold text-indigo-700"
          >
            {isRegister ? "Log in" : "Create an account"}
          </Link>
        </p>
      </section>
    </main>
  );
}