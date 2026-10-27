"use client";

import { useEffect, useRef, useState } from "react";
import { authenticatedRequest } from "@/lib/api";
import type { ResumeBuilderData } from "@/lib/resume-builder";

type DraftSummary = {
  id: string;
  title: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

type SavedDraft = DraftSummary & {
  data: ResumeBuilderData;
  photoStorageKey: string | null;
  photoDataUrl?: string | null;
};

type Props = {
  resume: ResumeBuilderData;
  photo: string | null;
  onLoad: (data: ResumeBuilderData, photo: string | null) => void;
};

export function ResumeBuilderDrafts({
  resume,
  photo,
  onLoad,
}: Props) {
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [activeDraft, setActiveDraft] = useState<{
    id: string;
    revision: number;
  } | null>(null);

  const [loadingList, setLoadingList] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const running = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadList() {
      try {
        const result = await authenticatedRequest<{
          drafts: DraftSummary[];
        }>("/api/resume-drafts");

        if (active) {
          setDrafts(result.drafts);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load saved drafts.",
          );
        }
      } finally {
        if (active) {
          setLoadingList(false);
        }
      }
    }

    void loadList();

    return () => {
      active = false;
    };
  }, []);

  async function refreshList() {
    if (running.current) return;

    running.current = true;
    setLoadingList(true);
    setError("");

    try {
      const result = await authenticatedRequest<{
        drafts: DraftSummary[];
      }>("/api/resume-drafts");

      setDrafts(result.drafts);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to refresh drafts.",
      );
    } finally {
      running.current = false;
      setLoadingList(false);
    }
  }

  async function saveDraft(asCopy: boolean) {
    if (running.current || loadingList) return;

    const title = resume.title.trim();

    if (!title) {
      setError("Enter a resume name before saving.");
      return;
    }

    running.current = true;
    setBusy(true);
    setError("");
    setMessage("");

    // Capture the content at the moment Save is clicked.
    // Include the cropped photo in the same save request.
    const data: ResumeBuilderData = {
      ...resume,
      title,
      photo: {
        storageKey: null,
        showOnResume: Boolean(photo) && resume.photo.showOnResume,
      },
    };

    const target = asCopy ? null : activeDraft;

    try {
      const result = await authenticatedRequest<{
        draft: SavedDraft;
      }>(
        target
          ? `/api/resume-drafts/${target.id}`
          : "/api/resume-drafts",
        {
          method: target ? "PUT" : "POST",
          body: JSON.stringify(
            target
              ? { revision: target.revision, data, photoDataUrl: photo }
              : { data, photoDataUrl: photo },
          ),
        },
      );

      const saved = result.draft;

      setActiveDraft({
        id: saved.id,
        revision: saved.revision,
      });

      setSelectedId(saved.id);

      setDrafts((current) => [
        {
          id: saved.id,
          title: saved.title,
          revision: saved.revision,
          createdAt: saved.createdAt,
          updatedAt: saved.updatedAt,
        },
        ...current.filter((draft) => draft.id !== saved.id),
      ]);

      setMessage(
        "Resume and photo saved successfully. Any edits made after clicking Save need another save.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save this draft.",
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  async function openDraft() {
    if (!selectedId || running.current || loadingList) return;

    if (
      !window.confirm(
        "Open this saved draft? This replaces the current editor contents, including any unsaved edits and photo.",
      )
    ) {
      return;
    }

    running.current = true;
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const result = await authenticatedRequest<{
        draft: SavedDraft;
      }>(`/api/resume-drafts/${selectedId}`);

      const saved = result.draft;

      if (saved.data.schemaVersion !== 1) {
        throw new Error(
          "This draft uses an unsupported format.",
        );
      }

      onLoad(saved.data, saved.photoDataUrl ?? null);

      setActiveDraft({
        id: saved.id,
        revision: saved.revision,
      });

      setMessage("Saved draft opened.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to open this draft.",
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="saved-drafts-heading"
      className="mb-6 rounded-xl border border-stone-200 bg-white p-5"
      aria-busy={busy || loadingList}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2
            id="saved-drafts-heading"
            className="text-lg font-semibold"
          >
            Saved resumes
          </h2>
          <p className="mt-1 text-xs leading-5 text-stone-600">
            Save manually before refreshing or leaving this page.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || loadingList}
            onClick={() => void saveDraft(false)}
            className="ui-button ui-button-primary"
          >
            {busy ? "Please wait..." : "Save draft"}
          </button>

          {activeDraft && (
            <button
              type="button"
              disabled={busy || loadingList}
              onClick={() => void saveDraft(true)}
              className="ui-button"
            >
              Save as new copy
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block min-w-0 flex-1 text-sm font-medium">
          Choose a saved resume
          <select
            value={selectedId}
            disabled={busy || loadingList}
            onChange={(event) =>
              setSelectedId(event.target.value)
            }
            className="mt-2 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">
              {loadingList
                ? "Loading drafts..."
                : drafts.length === 0
                  ? "No saved resumes yet"
                  : "Select a resume"}
            </option>

            {drafts.map((draft) => (
              <option key={draft.id} value={draft.id}>
                {draft.title} —{" "}
                {new Date(draft.updatedAt).toLocaleString()}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          disabled={!selectedId || busy || loadingList}
          onClick={() => void openDraft()}
          className="ui-button"
        >
          Open selected
        </button>

        <button
          type="button"
          disabled={busy || loadingList}
          onClick={() => void refreshList()}
          className="ui-button"
        >
          Refresh list
        </button>
      </div>

      <p className="mt-3 text-xs leading-5 text-stone-500">
        Selecting a resume does not open it. Use “Open selected”
        before editing that saved resume.
      </p>

      {photo && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Your photo is included when you save this draft. Its
          visibility follows the Show photo on resume setting.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="mt-3 rounded-lg bg-teal-50 p-3 text-sm text-teal-900"
        >
          {message}
        </p>
      )}
    </section>
  );
}