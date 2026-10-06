"use client";
import { RecruiterOverview } from "@/components/recruiter-overview";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ResumeUpload } from "@/components/resume-upload";
import { useAuth } from "@/components/auth-provider";
import {
  authenticatedRequest,
  type Role,
  type User,
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

type Overview = {
  stats: {
    totalResumes: number;
    parsedResumes: number;
    totalApplications: number;
    activeApplications: number;
  };
  recentApplications: {
    id: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    job: {
      id: string;
      title: string;
      company: { name: string };
    };
  }[];
};

const emptyForm: ProfileForm = {
  phone: "",
  location: "",
  headline: "",
  bio: "",
  education: "",
  experience: "",
  skills: "",
};

const roleLabels: Record<Role, string> = {
  CANDIDATE: "Candidate",
  RECRUITER: "Recruiter",
  ADMIN: "Administrator",
};

const profileFields: {
  name: keyof ProfileForm;
  label: string;
  maxLength: number;
  rows?: number;
}[] = [
  { name: "phone", label: "Phone", maxLength: 20 },
  { name: "location", label: "Location", maxLength: 150 },
  { name: "headline", label: "Headline", maxLength: 150 },
  { name: "bio", label: "About you", maxLength: 1000, rows: 4 },
  { name: "education", label: "Education", maxLength: 500, rows: 3 },
  { name: "experience", label: "Experience", maxLength: 1000, rows: 4 },
  { name: "skills", label: "Skills, separated by commas", maxLength: 3000 },
];

const buttonClass =
  "rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold hover:bg-slate-50 disabled:opacity-50";

const linkClass =
  "rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

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

  return (
    <DashboardContent
      key={user.id}
      user={user}
      logout={logout}
    />
  );
}

function DashboardContent({
  user,
  logout,
}: {
  user: User;
  logout: () => Promise<void>;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError("");

    try {
      await logout();
      router.replace("/login");
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "Logout failed.",
      );
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <span className="text-lg font-bold">AI Resume Analyzer</span>
        <button
          type="button"
          disabled={loggingOut}
          onClick={() => void handleLogout()}
          className={buttonClass}
        >
          {loggingOut ? "Logging out..." : "Log out"}
        </button>
      </header>

      {logoutError && (
        <p role="alert" className="mt-5 text-red-700">{logoutError}</p>
      )}

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
        <span className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
          {roleLabels[user.role]} account
        </span>
        <h1 className="mt-5 text-3xl font-bold">Welcome, {user.name}</h1>
        <p className="mt-2 break-all text-slate-600">{user.email}</p>
      </section>

      <nav aria-label="Dashboard shortcuts" className="mt-6 flex flex-wrap gap-3">
        <Link href="/jobs" className={linkClass}>
          {user.role === "RECRUITER" ? "Manage jobs" : "Browse jobs"}
        </Link>

        {(user.role === "CANDIDATE" || user.role === "RECRUITER") && (
          <Link href="/applications" className={linkClass}>
            {user.role === "CANDIDATE"
              ? "My applications"
              : "Review applications"}
          </Link>
        )}

        {user.role === "CANDIDATE" && (
          <>
            <Link href="/matches" className={linkClass}>
              Match resume to job
            </Link>
            <a href="#resumes" className={buttonClass}>Your resumes</a>
            <a href="#profile" className={buttonClass}>Edit profile</a>
          </>
        )}

        {user.role === "RECRUITER" && (
          <Link href="/recruiter" className={linkClass}>
            Manage recruiter profile & company
          </Link>
        )}
      </nav>

      {user.role === "CANDIDATE" && <CandidateOverview />}
{user.role === "RECRUITER" && <RecruiterOverview />}

      <ProfileEditor />

      {user.role === "CANDIDATE" && (
        <div id="resumes" className="scroll-mt-6">
          <ResumeUpload />
        </div>
      )}
    </main>
  );
}

function CandidateOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await authenticatedRequest<Overview>(
          "/api/dashboard/candidate",
        );
        if (active) setData(result);
      } catch (failure) {
        if (active) {
          setData(null);
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not load your overview.",
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
        { label: "Uploaded resumes", value: data.stats.totalResumes },
        { label: "Parsed resumes", value: data.stats.parsedResumes },
        { label: "Total applications", value: data.stats.totalApplications },
        { label: "Active applications", value: data.stats.activeApplications },
      ]
    : [];

  return (
    <section className="mt-8" aria-label="Candidate overview">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Your overview</h2>
        <button
          type="button"
          disabled={loading}
          className={buttonClass}
          onClick={() => {
            setLoading(true);
            setReload((value) => value + 1);
          }}
        >
          {loading ? "Loading..." : "Refresh overview"}
        </button>
      </div>

      {loading ? (
        <p role="status" className="mt-4 text-slate-600">
          Loading your counts and applications...
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
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <dt className="text-sm font-semibold text-slate-600">
                  {card.label}
                </dt>
                <dd className="mt-3 text-3xl font-bold text-indigo-700">
                  {card.value}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-3 text-sm text-slate-600">
            Active means Submitted, Reviewing, or Shortlisted. Refresh the
            overview after uploading a resume or changing an application.
          </p>

          {data.stats.totalResumes === 0 && (
            <p className="mt-4 rounded-xl bg-indigo-50 p-4 text-indigo-900">
              Get started by uploading your resume below.
            </p>
          )}

          {data.stats.totalResumes > 0 && data.stats.parsedResumes === 0 && (
            <p className="mt-4 rounded-xl bg-indigo-50 p-4 text-indigo-900">
              Open Your resumes below and extract text to enable matching
              and applications.
            </p>
          )}

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap justify-between gap-3">
              <h3 className="text-xl font-bold">Recent applications</h3>
              <Link href="/applications" className="font-semibold text-indigo-700">
                View all applications
              </Link>
            </div>

            {data.recentApplications.length === 0 ? (
              <p className="mt-4 text-slate-600">
                You have not applied to any jobs yet.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-200">
                {data.recentApplications.map((application) => (
                  <li key={application.id} className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-semibold">
                          {application.job.title}
                        </p>
                        <p className="mt-1 break-words text-sm text-slate-600">
                          {application.job.company.name}
                        </p>
                      </div>
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
                        {application.status.charAt(0) +
                          application.status.slice(1).toLowerCase()}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      Applied {new Date(application.createdAt).toLocaleDateString()}
                      {" | Updated "}
                      {new Date(application.updatedAt).toLocaleDateString()}
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

function ProfileEditor() {
  const [form, setForm] = useState<ProfileForm>({ ...emptyForm });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const saveRunning = useRef(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError("");

      try {
        const result = await authenticatedRequest<{ profile: Profile | null }>(
          "/api/profile",
        );

        if (!active) return;

        const profile = result.profile;

        setForm(
          profile
            ? {
                phone: profile.phone ?? "",
                location: profile.location ?? "",
                headline: profile.headline ?? "",
                bio: profile.bio ?? "",
                education: profile.education ?? "",
                experience: profile.experience ?? "",
                skills: profile.skills.join(", "),
              }
            : { ...emptyForm },
        );
      } catch (failure) {
        if (active) {
          setLoadError(
            failure instanceof Error
              ? failure.message
              : "Could not load your profile.",
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

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveRunning.current || loading || loadError) return;

    saveRunning.current = true;
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
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Could not save profile.",
      );
    } finally {
      saveRunning.current = false;
      setSaving(false);
    }
  }

  return (
    <section
      id="profile"
      className="mt-8 scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-8"
    >
      <h2 className="text-2xl font-bold">Your profile</h2>
      <p className="mt-2 text-slate-600">
        Keep your contact details, education, experience, and skills updated.
      </p>

      {loading ? (
        <p role="status" className="mt-5">Loading your profile...</p>
      ) : loadError ? (
        <div className="mt-5">
          <p role="alert" className="text-red-700">{loadError}</p>
          <button
            type="button"
            className={`${buttonClass} mt-3`}
            onClick={() => {
              setLoading(true);
              setReload((value) => value + 1);
            }}
          >
            Retry loading profile
          </button>
        </div>
      ) : (
        <form onSubmit={save} className="mt-6">
          {error && (
            <p role="alert" className="mb-4 text-red-700">{error}</p>
          )}
          {success && (
            <p role="status" className="mb-4 text-emerald-700">{success}</p>
          )}

          <fieldset disabled={saving} className="space-y-5">
            {profileFields.map((field) => (
              <label key={field.name} className="block">
                <span className="font-semibold">{field.label}</span>
                {field.rows ? (
                  <textarea
                    value={form[field.name]}
                    rows={field.rows}
                    maxLength={field.maxLength}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [field.name]: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                ) : (
                  <input
                    value={form[field.name]}
                    maxLength={field.maxLength}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [field.name]: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                )}
              </label>
            ))}

            <button
              type="submit"
              disabled={saving}
              className={`${linkClass} disabled:opacity-50`}
            >
              {saving ? "Saving..." : "Save profile"}
            </button>
          </fieldset>
        </form>
      )}
    </section>
  );
}