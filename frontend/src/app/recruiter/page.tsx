"use client";

import Link from "next/link";
import { PageHeading } from "@/components/ui";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { authenticatedRequest } from "@/lib/api";
import { CompanyForm } from "@/components/company-form";

type Company = {
  id: string;
  name: string;
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
};

type RecruiterProfile = {
  jobTitle: string | null;
  phone: string | null;
  company: Company | null;
};

export default function RecruiterPage() {
  const { user, loading, sessionError } = useAuth();

  if (loading) {
    return <main className="p-8">Checking your session...</main>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-8">
        <p>{sessionError || "Log in to manage your recruiter profile."}</p>
        <Link href="/login" className="text-teal-700 underline">
          Go to login
        </Link>
      </main>
    );
  }

  if (user.role !== "RECRUITER") {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-8">
        <p>This page is available to recruiter accounts.</p>
        <Link href="/dashboard" className="text-teal-700 underline">
          Back to dashboard
        </Link>
      </main>
    );
  }

  return <RecruiterSettings key={user.id} name={user.name} />;
}

function RecruiterSettings({ name }: { name: string }) {
  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const data = await authenticatedRequest<{
          profile: RecruiterProfile | null;
        }>("/api/recruiter/profile");

        if (active) setProfile(data.profile);
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load your recruiter profile.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const fields = new FormData(event.currentTarget);

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const data = await authenticatedRequest<{
        profile: RecruiterProfile;
      }>("/api/recruiter/profile", {
        method: "PATCH",
        body: JSON.stringify({
          jobTitle: String(fields.get("jobTitle") ?? "").trim() || null,
          phone: String(fields.get("phone") ?? "").trim() || null,
        }),
      });

      setProfile(data.profile);
      setSuccess("Recruiter profile saved.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to save profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="ui-page">
      <PageHeading eyebrow="Represent your team" title="Profile & company" description={`Manage your recruiter details and company presence, ${name}.`} />
      {loading ? (
        <p role="status">Loading your profile...</p>
      ) : loadError ? (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          <p>{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 underline"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="recruiter-grid">
          <section className="ui-panel">
            <h2 className="mb-6 text-xl font-bold">Your recruiter profile</h2>

            {error && (
              <p role="alert" className="mb-4 text-red-700">
                {error}
              </p>
            )}

            {success && (
              <p role="status" className="mb-4 text-emerald-700">
                {success}
              </p>
            )}

            <form onSubmit={saveProfile}>
              <fieldset disabled={saving} className="space-y-5">
                <label className="block">
                  <span className="font-medium">Job title</span>
                  <input
                    name="jobTitle"
                    defaultValue={profile?.jobTitle ?? ""}
                    maxLength={100}
                    placeholder="Hiring Manager"
                    className="ui-input mt-2 w-full"
                  />
                </label>

                <label className="block">
                  <span className="font-medium">Phone</span>
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={profile?.phone ?? ""}
                    maxLength={20}
                    className="ui-input mt-2 w-full"
                  />
                </label>

                <button
                  type="submit"
                  className="ui-button ui-button-primary"
                >
                  {saving ? "Saving..." : "Save profile"}
                </button>
              </fieldset>
            </form>
          </section>

          <CompanyForm />

        </div>
      )}
    </main>
  );
}