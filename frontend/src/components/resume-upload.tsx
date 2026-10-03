"use client";

import { useEffect, useState, type FormEvent } from "react";
import { authenticatedRequest } from "@/lib/api";

type ResumeItem = {
  id: string;
  originalName: string;
  sizeBytes: number;
  createdAt: string;
};

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export function ResumeUpload() {
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    authenticatedRequest<{ resumes: ResumeItem[] }>("/api/resumes")
      .then((data) => {
        if (active) {
          setResumes(data.resumes);
          setLoadError("");
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load your resumes.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  function refreshList() {
    setLoading(true);
    setLoadError("");
    setReloadKey((current) => current + 1);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (uploading || loading || loadError) return;

    setUploadError("");
    setSuccess("");

    const form = event.currentTarget;
    const body = new FormData(form);
    const file = body.get("resume");

    if (!(file instanceof File) || file.size === 0) {
      setUploadError("Please select a non-empty PDF file.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Please select a PDF file.");
      return;
    }

    if (file.size > MAX_RESUME_BYTES) {
      setUploadError("The PDF must be 5 MiB or smaller.");
      return;
    }

    setUploading(true);

    try {
      const data = await authenticatedRequest<{ resume: ResumeItem }>(
        "/api/resumes",
        {
          method: "POST",
          body,
        },
      );

      setResumes((current) =>
        [
          data.resume,
          ...current.filter((resume) => resume.id !== data.resume.id),
        ].slice(0, 50),
      );

      form.reset();
      setSuccess("Resume uploaded successfully.");
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Upload failed. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <section
      aria-labelledby="resume-heading"
      className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="resume-heading" className="text-2xl font-bold">
          Your resumes
        </h2>

        <button
          type="button"
          onClick={refreshList}
          disabled={loading || uploading}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-60"
        >
          {loading ? "Loading..." : "Refresh list"}
        </button>
      </div>

      {loadError && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">
          {loadError} Use Refresh list to try again.
        </p>
      )}

      <form
        onSubmit={handleUpload}
        aria-busy={uploading}
        className="mt-6"
      >
        <fieldset
          disabled={loading || uploading || Boolean(loadError)}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="resume-file"
              className="block text-sm font-semibold"
            >
              Choose your resume
            </label>

            <input
              id="resume-file"
              name="resume"
              type="file"
              accept=".pdf,application/pdf"
              required
              aria-describedby="resume-file-help"
              onChange={() => {
                setUploadError("");
                setSuccess("");
              }}
              className="mt-2 block w-full rounded-xl border border-slate-300 p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:font-semibold file:text-indigo-700 disabled:opacity-60"
            />

            <p id="resume-file-help" className="mt-2 text-sm text-slate-600">
              PDF only. Maximum size: 5 MiB.
            </p>
          </div>

          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {uploading ? "Uploading..." : "Upload resume"}
          </button>
        </fieldset>
      </form>

      {uploadError && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">
          {uploadError}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-emerald-50 p-4 text-emerald-800"
        >
          {success}
        </p>
      )}

      <h3 className="mt-8 font-semibold">Recent uploads</h3>

      {loading ? (
        <p role="status" className="mt-3 text-slate-600">
          Loading your resumes...
        </p>
      ) : !loadError && resumes.length === 0 ? (
        <p className="mt-3 text-slate-600">
          You have not uploaded a resume yet.
        </p>
      ) : !loadError ? (
        <ul className="mt-3 divide-y divide-slate-200">
          {resumes.map((resume) => (
            <li key={resume.id} className="py-4">
              <p className="break-all font-medium">{resume.originalName}</p>
              <p className="mt-1 text-sm text-slate-600">
                {Math.ceil(resume.sizeBytes / 1024)} KiB
                {" | "}
                {new Date(resume.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}