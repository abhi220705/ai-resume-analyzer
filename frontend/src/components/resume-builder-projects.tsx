"use client";

import type { ResumeProject } from "@/lib/resume-builder";

type Props = {
  entries: ResumeProject[];
  onChange: (entries: ResumeProject[]) => void;
};

const inputClass =
  "mt-2 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-normal text-stone-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100";

export function ResumeBuilderProjects({
  entries,
  onChange,
}: Props) {
  function addProject() {
    onChange([
      ...entries,
      {
        id: crypto.randomUUID(),
        name: "",
        role: "",
        technologies: [],
        link: "",
        bullets: [],
      },
    ]);
  }

  function updateProject(
    id: string,
    changes: Partial<ResumeProject>,
  ) {
    onChange(
      entries.map((entry) =>
        entry.id === id ? { ...entry, ...changes } : entry,
      ),
    );
  }

  function removeProject(id: string) {
    const project = entries.find((entry) => entry.id === id);

    if (
      project &&
      !window.confirm(
        `Remove ${project.name || "this project"}?`,
      )
    ) {
      return;
    }

    onChange(entries.filter((entry) => entry.id !== id));
  }

  return (
    <section
      className="mt-8 border-t border-stone-200 pt-6"
      aria-labelledby="projects-editor-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="projects-editor-heading"
          className="text-xl font-semibold"
        >
          Projects
        </h2>

        <button
          type="button"
          className="ui-button"
          onClick={addProject}
          disabled={entries.length >= 10}
        >
          + Add project
        </button>
      </div>

      <p className="mt-2 text-sm leading-6 text-stone-600">
        Include projects relevant to the roles you want. Explain
        what you personally built or contributed.
      </p>

      {entries.length === 0 && (
        <p className="mt-4 rounded-lg bg-stone-50 p-4 text-sm text-stone-500">
          No projects added yet. Select “Add project” to begin.
        </p>
      )}

      <div className="mt-5 space-y-5">
        {entries.map((entry, index) => (
          <fieldset
            key={entry.id}
            className="min-w-0 rounded-xl border border-stone-200 p-4"
          >
            <legend className="px-2 text-sm font-semibold text-teal-800">
              Project {index + 1}
            </legend>

            <div className="space-y-4">
              <label className="block text-sm font-semibold">
                Project name
                <input
                  className={inputClass}
                  value={entry.name}
                  maxLength={150}
                  placeholder="AI Resume Analyzer"
                  onChange={(event) =>
                    updateProject(entry.id, {
                      name: event.target.value,
                    })
                  }
                />
              </label>

              <label className="block text-sm font-semibold">
                Your role — optional
                <input
                  className={inputClass}
                  value={entry.role}
                  maxLength={150}
                  placeholder="Full-stack developer"
                  onChange={(event) =>
                    updateProject(entry.id, {
                      role: event.target.value,
                    })
                  }
                />
              </label>

              <label className="block text-sm font-semibold">
                Technologies
                <input
                  className={inputClass}
                  value={entry.technologies.join(",")}
                  maxLength={500}
                  placeholder="React, Node.js, PostgreSQL"
                  onChange={(event) =>
                    updateProject(entry.id, {
                      technologies: event.target.value.split(","),
                    })
                  }
                />
                <span className="mt-2 block text-xs font-normal text-stone-500">
                  Separate technologies with commas.
                </span>
              </label>

              <label className="block text-sm font-semibold">
                Project or repository URL — optional
                <input
                  type="url"
                  className={inputClass}
                  value={entry.link}
                  maxLength={500}
                  placeholder="https://github.com/yourname/project"
                  onChange={(event) =>
                    updateProject(entry.id, {
                      link: event.target.value,
                    })
                  }
                />
              </label>

              <label className="block text-sm font-semibold">
                Your contributions
                <textarea
                  className={inputClass}
                  value={entry.bullets.join("\n")}
                  maxLength={2500}
                  rows={6}
                  placeholder={
                    "Built a candidate dashboard using React.\nCreated authenticated API endpoints with Express.\nStored resume feedback in PostgreSQL."
                  }
                  onChange={(event) =>
                    updateProject(entry.id, {
                      bullets: event.target.value.split("\n"),
                    })
                  }
                />
                <span className="mt-2 block text-xs font-normal leading-5 text-stone-500">
                  Write one bullet point per line. Describe your
                  actual work; include numbers only when you can
                  support them.
                </span>
              </label>

              <button
                type="button"
                onClick={() => removeProject(entry.id)}
                className="rounded px-2 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-700"
              >
                Remove project {index + 1}
              </button>
            </div>
          </fieldset>
        ))}
      </div>

      {entries.length >= 10 && (
        <p className="mt-3 text-xs text-stone-500">
          You can add up to 10 projects.
        </p>
      )}
    </section>
  );
}

export function ResumeProjectsPreview({
  entries,
}: {
  entries: ResumeProject[];
}) {
  const visibleEntries = entries.filter(
    (entry) =>
      entry.name.trim() ||
      entry.role.trim() ||
      entry.link.trim() ||
      entry.technologies.some((technology) => technology.trim()) ||
      entry.bullets.some((bullet) => bullet.trim()),
  );

  if (visibleEntries.length === 0) return null;

  return (
    <section className="mt-6">
      <h3 className="border-b border-stone-200 pb-2 text-xs font-bold uppercase tracking-widest text-teal-800">
        Projects
      </h3>

      <div className="mt-3 space-y-4">
        {visibleEntries.map((entry) => {
          const technologies = entry.technologies
            .map((technology) => technology.trim())
            .filter(Boolean);

          const bullets = entry.bullets
            .map((bullet) => bullet.trim())
            .filter(Boolean);

          return (
            <div key={entry.id}>
              {entry.name.trim() && (
                <p className="text-sm font-bold">{entry.name}</p>
              )}

              {entry.role.trim() && (
                <p className="mt-1 text-xs font-medium text-stone-700">
                  {entry.role}
                </p>
              )}

              {technologies.length > 0 && (
                <p className="mt-1 text-xs text-stone-600">
                  {technologies.join(", ")}
                </p>
              )}

              {entry.link.trim() && (
                <p className="mt-1 break-all text-xs text-teal-800">
                  {entry.link}
                </p>
              )}

              {bullets.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-6">
                  {bullets.map((bullet, index) => (
                    <li key={`${entry.id}-${index}`}>{bullet}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}