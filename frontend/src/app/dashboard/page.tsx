"use client";

import { ResumeUpload } from "@/components/resume-upload";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import {
  authenticatedRequest,
  type Role,
} from "@/lib/api";

type Profile = {
  phone: string | null;
  location: string | null;
  headline: string | null;
  bio: string | null;
  education: string | null;
  experience: string | null;
  skills: string[];
};

type ProfileForm = {
  phone: string;
  location: string;
  headline: string;
  bio: string;
  education: string;
  experience: string;
  skills: string;
};

const roleLabels: Record<Role, string> = {
  CANDIDATE: "Candidate",
  RECRUITER: "Recruiter",
  ADMIN: "Administrator",
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const [busy, setBusy] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState<ProfileForm>({
    phone: "",
    location: "",
    headline: "",
    bio: "",
    education: "",
    experience: "",
    skills: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    let active = true;

    async function loadProfile() {
      setProfileLoading(true);
      setError("");

      try {
        const result = await authenticatedRequest<{
          profile: Profile | null;
        }>("/api/profile");

        if (!active || !result.profile) return;

        setForm({
          phone: result.profile.phone ?? "",
          location: result.profile.location ?? "",
          headline: result.profile.headline ?? "",
          bio: result.profile.bio ?? "",
          education: result.profile.education ?? "",
          experience: result.profile.experience ?? "",
          skills: result.profile.skills.join(", "),
        });
      } catch (profileError) {
        if (active) {
          setError(
            profileError instanceof Error
              ? profileError.message
              : "Unable to load your profile.",
          );
        }
      } finally {
        if (active) {
          setProfileLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [user]);

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSaveProfile(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await authenticatedRequest<{ profile: Profile }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          phone: form.phone.trim() || null,
          location: form.location.trim() || null,
          headline: form.headline.trim() || null,
          bio: form.bio.trim() || null,
          education: form.education.trim() || null,
          experience: form.experience.trim() || null,
          skills: form.skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean),
        }),
      });

      setSuccess("Profile saved successfully.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save your profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setError("");

    try {
      await logout();
      router.replace("/login");
    } catch (logoutError) {
      setError(
        logoutError instanceof Error
          ? logoutError.message
          : "Logout failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p role="status">Checking your session...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <span className="text-lg font-bold">AI Resume Analyzer</span>

        <button
          onClick={handleLogout}
          disabled={busy}
          className="rounded-xl border border-slate-300 bg-white px-5 py-2 font-semibold hover:bg-slate-100 disabled:opacity-60"
        >
          {busy ? "Logging out..." : "Log out"}
        </button>
      </header>
      {user.role === "CANDIDATE" && (
  <Link
    href="/matches"
    className="mt-6 mr-3 inline-block rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
  >
    Match resume to job
  </Link>
)}
      <Link
  href="/jobs"
  className="mt-6 mr-3 inline-block rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
>
  {user.role === "RECRUITER" ? "Manage jobs" : "Browse jobs"}
</Link>

      {user.role === "RECRUITER" && (
  <Link
    href="/recruiter"
    className="mt-6 inline-block rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
  >
    Manage recruiter profile & company
  </Link>
)}

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="mt-6 rounded-xl bg-emerald-50 p-4 text-emerald-700"
        >
          {success}
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
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">Your profile</h2>
          <p className="mt-2 text-slate-600">
            Add information that will help with resume analysis and job
            matching.
          </p>
        </div>

        {profileLoading ? (
          <p role="status">Loading your profile...</p>
        ) : (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="font-semibold">Phone</span>
                <input
                  value={form.phone}
                  onChange={(event) =>
                    updateField("phone", event.target.value)
                  }
                  maxLength={20}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                  placeholder="9876543210"
                />
              </label>

              <label className="block">
                <span className="font-semibold">Location</span>
                <input
                  value={form.location}
                  onChange={(event) =>
                    updateField("location", event.target.value)
                  }
                  maxLength={150}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                  placeholder="Mumbai"
                />
              </label>
            </div>

            <label className="block">
              <span className="font-semibold">Headline</span>
              <input
                value={form.headline}
                onChange={(event) =>
                  updateField("headline", event.target.value)
                }
                maxLength={150}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                placeholder="Information Technology Student"
              />
            </label>

            <label className="block">
              <span className="font-semibold">About you</span>
              <textarea
                value={form.bio}
                onChange={(event) => updateField("bio", event.target.value)}
                maxLength={1000}
                rows={4}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                placeholder="Write a short introduction..."
              />
            </label>

            <label className="block">
              <span className="font-semibold">Education</span>
              <textarea
                value={form.education}
                onChange={(event) =>
                  updateField("education", event.target.value)
                }
                maxLength={500}
                rows={3}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                placeholder="B.E. Information Technology"
              />
            </label>

            <label className="block">
              <span className="font-semibold">Experience</span>
              <textarea
                value={form.experience}
                onChange={(event) =>
                  updateField("experience", event.target.value)
                }
                maxLength={1000}
                rows={4}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                placeholder="Academic projects, internships, or work experience"
              />
            </label>

            <label className="block">
              <span className="font-semibold">Skills</span>
              <input
                value={form.skills}
                onChange={(event) =>
                  updateField("skills", event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                placeholder="Java, TypeScript, PostgreSQL, React"
              />
              <span className="mt-2 block text-sm text-slate-500">
                Separate skills with commas.
              </span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save profile"}
            </button>
          </form>
        )}
      </section>
      {user.role === "CANDIDATE" && (
  <ResumeUpload key={user.id} />
)}
    </main>
  );
}