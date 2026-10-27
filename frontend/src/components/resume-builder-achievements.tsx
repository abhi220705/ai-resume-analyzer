"use client";

import type { ResumeAchievement } from "@/lib/resume-builder";

type Props = {
  entries: ResumeAchievement[];
  onChange: (entries: ResumeAchievement[]) => void;
};

const inputClass =
  "mt-2 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-normal text-stone-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100";

export function ResumeBuilderAchievements({
  entries,
  onChange,
}: Props) {
  function addAchievement() {
    onChange([
      ...entries,
      {
        id: crypto.randomUUID(),
        title: "",
        organization: "",
        date: "",
        details: "",
      },
    ]);
  }

  function updateAchievement(
    id: string,
    changes: Partial<ResumeAchievement>,
  ) {
    onChange(
      entries.map((entry) =>
        entry.id === id ? { ...entry, ...changes } : entry,
      ),
    );
  }

  function removeAchievement(id: string) {
    const entry = entries.find((item) => item.id === id);

    if (
      !window.confirm(
        `Remove ${entry?.title || "this achievement"}?`,
      )
    ) {
      return;
    }

    onChange(entries.filter((entry) => entry.id !== id));
  }

  return (
    <section
      className="mt-8 border-t border-stone-200 pt-6"
      aria-labelledby="achievements-editor-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="achievements-editor-heading"
          className="text-xl font-semibold"
        >
          Achievements & certifications
        </h2>

        <button
          type="button"
          className="ui-button"
          onClick={addAchievement}
          disabled={entries.length >= 10}
        >
          + Add achievement
        </button>
      </div>

      <p className="mt-2 text-sm leading-6 text-stone-600">
        Add relevant awards, competition results, or certifications
        you have earned. Leave this section empty if it does not
        apply.
      </p>

      <div className="mt-5 space-y-5">
        {entries.map((entry, index) => (
          <fieldset
            key={entry.id}
            className="min-w-0 rounded-xl border border-stone-200 p-4"
          >
            <legend className="px-2 text-sm font-semibold text-teal-800">
              Achievement {index + 1}
            </legend>

            <div className="space-y-4">
              <label className="block text-sm font-semibold">
                Title
                <input
                  value={entry.title}
                  maxLength={200}
                  className={inputClass}
                  placeholder="Certification or award name"
                  onChange={(event) =>
                    updateAchievement(entry.id, {
                      title: event.target.value,
                    })
                  }
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold">
                  Issuing organisation — optional
                  <input
                    value={entry.organization}
                    maxLength={200}
                    className={inputClass}
                    placeholder="Organisation or institution"
                    onChange={(event) =>
                      updateAchievement(entry.id, {
                        organization: event.target.value,
                      })
                    }
                  />
                </label>

                <label className="block text-sm font-semibold">
                  Date earned — optional
                  <input
                    type="month"
                    value={entry.date}
                    className={inputClass}
                    onChange={(event) =>
                      updateAchievement(entry.id, {
                        date: event.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <label className="block text-sm font-semibold">
                Details — optional
                <textarea
                  value={entry.details}
                  maxLength={800}
                  rows={3}
                  className={inputClass}
                  placeholder="Briefly describe the achievement or what the certification covered."
                  onChange={(event) =>
                    updateAchievement(entry.id, {
                      details: event.target.value,
                    })
                  }
                />
              </label>

              <button
                type="button"
                onClick={() => removeAchievement(entry.id)}
                className="rounded px-2 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-700"
              >
                Remove achievement {index + 1}
              </button>
            </div>
          </fieldset>
        ))}
      </div>

      {entries.length >= 10 && (
        <p className="mt-3 text-xs text-stone-500">
          You can add up to 10 achievements or certifications.
        </p>
      )}
    </section>
  );
}

function formatMonth(value: string): string {
  if (!/^\d{4}-\d{2}$/.test(value)) return "";

  const [year, month] = value.split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const monthLabel = months[Number(month) - 1];

  return monthLabel ? `${monthLabel} ${year}` : "";
}

export function ResumeAchievementsPreview({
  entries,
}: {
  entries: ResumeAchievement[];
}) {
  const visibleEntries = entries.filter(
    (entry) =>
      entry.title.trim() ||
      entry.organization.trim() ||
      entry.details.trim(),
  );

  if (visibleEntries.length === 0) return null;

  return (
    <section className="mt-6">
      <h3 className="border-b border-stone-200 pb-2 text-xs font-bold uppercase tracking-widest text-teal-800">
        Achievements & certifications
      </h3>

      <div className="mt-3 space-y-4">
        {visibleEntries.map((entry) => {
          const metadata = [
            entry.organization.trim(),
            formatMonth(entry.date),
          ]
            .filter(Boolean)
            .join(" | ");

          return (
            <div key={entry.id}>
              {entry.title.trim() && (
                <p className="text-sm font-bold">{entry.title}</p>
              )}

              {metadata && (
                <p className="mt-1 text-xs text-stone-600">
                  {metadata}
                </p>
              )}

              {entry.details.trim() && (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                  {entry.details}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}