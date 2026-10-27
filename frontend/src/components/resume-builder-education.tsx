"use client";

import type { ResumeEducation } from "@/lib/resume-builder";

type Props = {
  entries: ResumeEducation[];
  onChange: (entries: ResumeEducation[]) => void;
};

const inputClass =
  "mt-2 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-normal text-stone-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100";

export function ResumeBuilderEducation({
  entries,
  onChange,
}: Props) {
  function addEducation() {
    onChange([
      ...entries,
      {
        id: crypto.randomUUID(),
        institution: "",
        qualification: "",
        fieldOfStudy: "",
        startDate: "",
        endDate: "",
        currentlyStudying: false,
        grade: "",
        details: "",
      },
    ]);
  }

  function updateEducation(
    id: string,
    changes: Partial<ResumeEducation>,
  ) {
    onChange(
      entries.map((entry) =>
        entry.id === id ? { ...entry, ...changes } : entry,
      ),
    );
  }

  function removeEducation(id: string) {
    const entry = entries.find((item) => item.id === id);

    if (
      entry &&
      !window.confirm(
        `Remove ${entry.institution || "this education entry"}?`,
      )
    ) {
      return;
    }

    onChange(entries.filter((entry) => entry.id !== id));
  }

  return (
    <section
      className="mt-8 border-t border-stone-200 pt-6"
      aria-labelledby="education-editor-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="education-editor-heading"
          className="text-xl font-semibold"
        >
          Education
        </h2>

        <button
          type="button"
          className="ui-button"
          onClick={addEducation}
          disabled={entries.length >= 10}
        >
          + Add education
        </button>
      </div>

      <p className="mt-2 text-sm leading-6 text-stone-600">
        Add your most recent qualification first. You can include
        college, school, or relevant training.
      </p>

      {entries.length === 0 && (
        <p className="mt-4 rounded-lg bg-stone-50 p-4 text-sm text-stone-500">
          No education added yet. Select “Add education” to begin.
        </p>
      )}

      <div className="mt-5 space-y-5">
        {entries.map((entry, index) => (
          <fieldset
            key={entry.id}
            className="min-w-0 rounded-xl border border-stone-200 p-4"
          >
            <legend className="px-2 text-sm font-semibold text-teal-800">
              Education {index + 1}
            </legend>

            <div className="space-y-4">
              <label className="block text-sm font-semibold">
                Institution
                <input
                  className={inputClass}
                  value={entry.institution}
                  maxLength={200}
                  placeholder="St. Francis Institute of Technology"
                  onChange={(event) =>
                    updateEducation(entry.id, {
                      institution: event.target.value,
                    })
                  }
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold">
                  Qualification
                  <input
                    className={inputClass}
                    value={entry.qualification}
                    maxLength={150}
                    placeholder="Bachelor of Engineering"
                    onChange={(event) =>
                      updateEducation(entry.id, {
                        qualification: event.target.value,
                      })
                    }
                  />
                </label>

                <label className="block text-sm font-semibold">
                  Field of study
                  <input
                    className={inputClass}
                    value={entry.fieldOfStudy}
                    maxLength={150}
                    placeholder="Information Technology"
                    onChange={(event) =>
                      updateEducation(entry.id, {
                        fieldOfStudy: event.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold">
                  Start date
                  <input
                    type="month"
                    className={inputClass}
                    value={entry.startDate}
                    max={
                      !entry.currentlyStudying && entry.endDate
                        ? entry.endDate
                        : undefined
                    }
                    onChange={(event) =>
                      updateEducation(entry.id, {
                        startDate: event.target.value,
                      })
                    }
                  />
                </label>

                <label className="block text-sm font-semibold">
                  {entry.currentlyStudying
                    ? "Expected graduation"
                    : "End date"}
                  <input
                    type="month"
                    className={inputClass}
                    value={entry.endDate}
                    min={entry.startDate || undefined}
                    onChange={(event) =>
                      updateEducation(entry.id, {
                        endDate: event.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={entry.currentlyStudying}
                  className="h-4 w-4 accent-teal-800"
                  onChange={(event) =>
                    updateEducation(entry.id, {
                      currentlyStudying: event.target.checked,
                    })
                  }
                />
                I am currently studying here
              </label>

              <label className="block text-sm font-semibold">
                Grade / CGPA — optional
                <input
                  className={inputClass}
                  value={entry.grade}
                  maxLength={80}
                  placeholder="CGPA: 8.5/10"
                  onChange={(event) =>
                    updateEducation(entry.id, {
                      grade: event.target.value,
                    })
                  }
                />
              </label>

              <label className="block text-sm font-semibold">
                Additional details — optional
                <textarea
                  className={inputClass}
                  value={entry.details}
                  maxLength={800}
                  rows={3}
                  placeholder="Relevant coursework, honours, or academic achievements"
                  onChange={(event) =>
                    updateEducation(entry.id, {
                      details: event.target.value,
                    })
                  }
                />
              </label>

              {entry.startDate &&
                entry.endDate &&
                entry.endDate < entry.startDate && (
                  <p role="alert" className="text-sm text-red-700">
                    The end date must not be before the start date.
                  </p>
                )}

              <button
                type="button"
                onClick={() => removeEducation(entry.id)}
                className="rounded px-2 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-700"
              >
                Remove education {index + 1}
              </button>
            </div>
          </fieldset>
        ))}
      </div>

      {entries.length >= 10 && (
        <p className="mt-3 text-xs text-stone-500">
          You can add up to 10 education entries.
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

export function ResumeEducationPreview({
  entries,
}: {
  entries: ResumeEducation[];
}) {
  const visibleEntries = entries.filter(
    (entry) =>
      entry.institution.trim() ||
      entry.qualification.trim() ||
      entry.fieldOfStudy.trim() ||
      entry.grade.trim() ||
      entry.details.trim(),
  );

  if (visibleEntries.length === 0) return null;

  return (
    <section className="mt-6">
      <h3 className="border-b border-stone-200 pb-2 text-xs font-bold uppercase tracking-widest text-teal-800">
        Education
      </h3>

      <div className="mt-3 space-y-4">
        {visibleEntries.map((entry) => {
          const qualification = [
            entry.qualification.trim(),
            entry.fieldOfStudy.trim(),
          ]
            .filter(Boolean)
            .join(" — ");

          const start = formatMonth(entry.startDate);
          const end = formatMonth(entry.endDate);

          const endLabel = entry.currentlyStudying
            ? end
              ? `Expected ${end}`
              : "Present"
            : end;

          const dates = [start, endLabel]
            .filter(Boolean)
            .join(" – ");

          return (
            <div key={entry.id}>
              {entry.institution.trim() && (
                <p className="text-sm font-bold">
                  {entry.institution}
                </p>
              )}

              {qualification && (
                <p className="mt-1 text-sm">{qualification}</p>
              )}

              {dates && (
                <p className="mt-1 text-xs text-stone-600">
                  {dates}
                </p>
              )}

              {entry.grade.trim() && (
                <p className="mt-1 text-xs">{entry.grade}</p>
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