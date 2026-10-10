"use client";

import Link from "next/link";
import { Brand, Icon } from "@/components/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { apiRequest } from "@/lib/api";
import { HeroBackgroundMedia } from "@/components/hero-background";

const inputClass = "ui-input";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { user, loading, sessionError, login } = useAuth();

  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  const card = (
    <section className="auth-card">
      <Link href="/" className="auth-mobile-brand">
        <Brand />
      </Link>

      <p className="ui-eyebrow">
        {isRegister ? "A fresh start" : "Your workspace awaits"}
      </p>

      <h1 className="mt-2">
        {isRegister ? "Create your account" : "Welcome back"}
      </h1>

      <p className="mt-2 text-stone-600">
        {isRegister
          ? "Join as a candidate or recruiter to access your workspace."
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
        aria-busy={busy}
        onSubmit={handleSubmit}
        aria-describedby={error ? "form-error" : undefined}
        className="mt-6"
      >
        <fieldset
          disabled={busy}
          className={isRegister ? "auth-field-grid" : "space-y-4"}
        >
          {isRegister && (
            <div>
              <label htmlFor="name" className="text-sm font-semibold">
                Full name
              </label>
              <input
                id="name"
                name="name"
                autoComplete="name"
                placeholder="Jane Doe"
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
              placeholder="you@company.com"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
            />
          </div>

          {isRegister && (
            <div
              role="radiogroup"
              aria-labelledby="role-legend"
              className="auth-span-2"
            >
              <span id="role-legend" className="auth-role-legend">
                Account type
              </span>
              <div className="auth-role-grid">
                <label className="auth-role-option">
                  <input
                    type="radio"
                    name="role"
                    value="CANDIDATE"
                    defaultChecked
                  />
                  <span className="auth-role-card">
                    <strong>Candidate</strong>
                    <small>Job seeker — score and improve your resume</small>
                  </span>
                </label>

                <label className="auth-role-option">
                  <input type="radio" name="role" value="RECRUITER" />
                  <span className="auth-role-card">
                    <strong>Recruiter</strong>
                    <small>Hiring team — post roles and rank matches</small>
                  </span>
                </label>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="password" className="text-sm font-semibold">
              Password
            </label>
            <div className="password-wrap">
              <input
                key={isRegister ? "new-password" : "login-password"}
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                placeholder={isRegister ? "At least 12 characters" : "••••••••••••"}
                required
                minLength={isRegister ? 12 : 1}
                aria-describedby={isRegister ? "password-help" : undefined}
                className={inputClass}
              />
              <button
                type="button"
                className="password-toggle"
                aria-controls="password"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {isRegister && (
              <p id="password-help" className="mt-2 text-xs text-stone-500">
                 
              </p>
            )}
          </div>

          {isRegister && (
            <div>
              <label htmlFor="confirmPassword" className="text-sm font-semibold">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                required
                className={inputClass}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className={`ui-button ui-button-primary mx-auto ${
              isRegister ? " auth-span-2" : ""
            }`}
          >
            {busy
              ? "Please wait…"
              : isRegister
                ? "Create account"
                : "Log in"}
          </button>
        </fieldset>
      </form>

      <div className="auth-card-footer">
        <p className="auth-alt-action">
          {isRegister ? "Already have an account? " : "New here? "}
          <Link
            href={isRegister ? "/login" : "/register"}
            onClick={() => {
              setRegistered(false);
              setError("");
            }}
            className="font-semibold text-emerald-800 hover:text-emerald-950 transition-colors"
          >
            {isRegister ? "Log in" : "Create an account"}
          </Link>
        </p>

        <div className="auth-secure-note">
          <Icon name="shield" />
          <span>Encrypted session • We never share your data</span>
        </div>
      </div>
    </section>
  );

  /* Register has its own single-panel layout: the bloom plays full-bleed
     behind a centred card, instead of the two-column login split. */
  if (mode === "register") {
    return (
      <main className="auth-page-single">
        <div className="auth-aurora" aria-hidden="true">
          <HeroBackgroundMedia />
        </div>

        <header className="auth-single-header">
          <Link
            href="/"
            aria-label="AI Resume Analyzer home"
            className="nav-brand-link"
          >
            <Brand />
          </Link>
        </header>

        <div className="auth-single-inner">{card}</div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      {/* ─── Left Panel (Auth Story) ─── */}
      <aside className="auth-story">
        {/* Header aligned identically to Homepage Navbar height (72px) */}
        <header className="auth-story-header">
          <Link href="/" aria-label="AI Resume Analyzer home" className="nav-brand-link">
            <Brand />
          </Link>
        </header>

        <div className="auth-story-body">
          {/* <div className="auth-eyebrow-pill">
            <Icon name="sparkles" />
            <span>WELCOME BACK TO YOUR WORKSPACE</span>
          </div> */}

          <h2>
            Bring your experience.
            <br />
            <span className="auth-title-gradient">Find your direction.</span>
          </h2>

          <p className="auth-story-copy">
            Sign in to access your ATS resume scores, skill match reports, and
            application pipeline.
          </p>

          <div className="auth-feature-cards">
            <div className="auth-feature-card">
              <div className="auth-feature-icon">
                <Icon name="document" />
              </div>
              <div>
                <strong>ATS Resume Diagnostics</strong>
                <p>Rule-based score &amp; OCR formatting check</p>
              </div>
            </div>

            <div className="auth-feature-card">
              <div className="auth-feature-icon">
                <Icon name="match" />
              </div>
              <div>
                <strong>Live Job Skill Coverage</strong>
                <p>Required vs. preferred skill breakdown</p>
              </div>
            </div>

            <div className="auth-feature-card">
              <div className="auth-feature-icon">
                <Icon name="applications" />
              </div>
              <div>
                <strong>Unified Application Pipeline</strong>
                <p>Track interview milestones in one place</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-story-footer">
          <span className="auth-footer-dot" />
          <span>AI Resume Analyzer • Verified Workspace</span>
        </div>
      </aside>

      {/* ─── Right Panel (Form) ─── */}
      <div className="auth-content">{card}</div>
    </main>
  );
}
