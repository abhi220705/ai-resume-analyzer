"use client";

import type {
  ResumeExperience,
  ResumeSkillGroup,
} from "@/lib/resume-builder";

type Props = {
  experience: ResumeExperience[];
  skillGroups: ResumeSkillGroup[];
  onExperienceChange: (entries: ResumeExperience[]) => void;
  onSkillsChange: (groups: ResumeSkillGroup[]) => void;
};

const inputClass =
  "mt-2 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-normal text-stone-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100";

const removeClass =
  "rounded px-2 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-700";

export function ResumeBuilderExperienceSkills({
  experience,
  skillGroups,
  onExperienceChange,
  onSkillsChange,
}: Props) {
  function addExperience() {
    onExperienceChange([
      ...experience,
      {
        id: crypto.randomUUID(),
        company: "",
        role: "",
        location: "",
        startDate: "",
        endDate: "",
        currentlyWorking: false,
        bullets: [],
      },
    ]);
  }

  function updateExperience(
    id: string,
    changes: Partial<ResumeExperience>,
  ) {
    onExperienceChange(
      experience.map((entry) =>
        entry.id === id ? { ...entry, ...changes } : entry,
      ),
    );
  }

  function removeExperience(id: string) {
    const entry = experience.find((item) => item.id === id);

    if (
      !window.confirm(
        `Remove ${entry?.company || "this experience entry"}?`,
      )
    ) {
      return;
    }

    onExperienceChange(
      experience.filter((entry) => entry.id !== id),
    );
  }

  function addSkillGroup() {
    onSkillsChange([
      ...skillGroups,
      {
        id: crypto.randomUUID(),
        category: "",
        skills: [],
      },
    ]);
  }

  function updateSkillGroup(
    id: string,
    changes: Partial<ResumeSkillGroup>,
  ) {
    onSkillsChange(
      skillGroups.map((group) =>
        group.id === id ? { ...group, ...changes } : group,
      ),
    );
  }

  function removeSkillGroup(id: string) {
    const group = skillGroups.find((item) => item.id === id);

    if (
      !window.confirm(
        `Remove ${group?.category || "this skill group"}?`,
      )
    ) {
      return;
    }

    onSkillsChange(
      skillGroups.filter((group) => group.id !== id),
    );
  }

  return (
    <>
      <section
        className="mt-8 border-t border-stone-200 pt-6"
        aria-labelledby="experience-editor-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="experience-editor-heading"
            className="text-xl font-semibold"
          >
            Work experience
          </h2>

          <button
            type="button"
            className="ui-button"
            onClick={addExperience}
            disabled={experience.length >= 10}
          >
            + Add experience
          </button>
        </div>

        <p className="mt-2 text-sm leading-6 text-stone-600">
          Include internships, employment, or relevant freelance
          work. If you have no work experience, leave this section
          empty—it will not appear in your resume.
        </p>

        <div className="mt-5 space-y-5">
          {experience.map((entry, index) => (
            <fieldset
              key={entry.id}
              className="min-w-0 rounded-xl border border-stone-200 p-4"
            >
              <legend className="px-2 text-sm font-semibold text-teal-800">
                Experience {index + 1}
              </legend>

              <div className="space-y-4">
                <label className="block text-sm font-semibold">
                  Company / organisation
                  <input
                    value={entry.company}
                    maxLength={200}
                    className={inputClass}
                    placeholder="Organisation name"
                    onChange={(event) =>
                      updateExperience(entry.id, {
                        company: event.target.value,
                      })
                    }
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold">
                    Role
                    <input
                      value={entry.role}
                      maxLength={150}
                      className={inputClass}
                      placeholder="Software Development Intern"
                      onChange={(event) =>
                        updateExperience(entry.id, {
                          role: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="block text-sm font-semibold">
                    Location — optional
                    <input
                      value={entry.location}
                      maxLength={150}
                      className={inputClass}
                      placeholder="Mumbai / Remote"
                      onChange={(event) =>
                        updateExperience(entry.id, {
                          location: event.target.value,
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
                      value={entry.startDate}
                      max={
                        !entry.currentlyWorking && entry.endDate
                          ? entry.endDate
                          : undefined
                      }
                      className={inputClass}
                      onChange={(event) =>
                        updateExperience(entry.id, {
                          startDate: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="block text-sm font-semibold">
                    End date
                    <input
                      type="month"
                      value={
                        entry.currentlyWorking ? "" : entry.endDate
                      }
                      min={entry.startDate || undefined}
                      disabled={entry.currentlyWorking}
                      className={`${inputClass} disabled:bg-stone-100 disabled:text-stone-400`}
                      onChange={(event) =>
                        updateExperience(entry.id, {
                          endDate: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>

                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={entry.currentlyWorking}
                    className="h-4 w-4 accent-teal-800"
                    onChange={(event) =>
                      updateExperience(entry.id, {
                        currentlyWorking: event.target.checked,
                      })
                    }
                  />
                  I currently work here
                </label>

                {!entry.currentlyWorking &&
                  entry.startDate &&
                  entry.endDate &&
                  entry.endDate < entry.startDate && (
                    <p role="alert" className="text-sm text-red-700">
                      The end date must not be before the start date.
                    </p>
                  )}

                <label className="block text-sm font-semibold">
                  Responsibilities and achievements
                  <textarea
                    value={entry.bullets.join("\n")}
                    maxLength={2500}
                    rows={6}
                    className={inputClass}
                    placeholder={
                      "Developed API endpoints for the application.\nFixed interface issues identified during testing."
                    }
                    onChange={(event) =>
                      updateExperience(entry.id, {
                        bullets: event.target.value.split("\n"),
                      })
                    }
                  />
                  <span className="mt-2 block text-xs font-normal leading-5 text-stone-500">
                    Write one bullet point per line. Include only
                    responsibilities and achievements that are true.
                  </span>
                </label>

                <button
                  type="button"
                  className={removeClass}
                  onClick={() => removeExperience(entry.id)}
                >
                  Remove experience {index + 1}
                </button>
              </div>
            </fieldset>
          ))}
        </div>

        {experience.length >= 10 && (
          <p className="mt-3 text-xs text-stone-500">
            You can add up to 10 experience entries.
          </p>
        )}
      </section>

      <section
        className="mt-8 border-t border-stone-200 pt-6"
        aria-labelledby="skills-editor-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="skills-editor-heading"
            className="text-xl font-semibold"
          >
            Skills
          </h2>

          <button
            type="button"
            className="ui-button"
            onClick={addSkillGroup}
            disabled={skillGroups.length >= 10}
          >
            + Add skill group
          </button>
        </div>

        <p className="mt-2 text-sm leading-6 text-stone-600">
          Group related skills together. For example: Languages —
          Java, Python, TypeScript.
        </p>

        <div className="mt-5 space-y-5">
          {skillGroups.map((group, index) => (
            <fieldset
              key={group.id}
              className="min-w-0 rounded-xl border border-stone-200 p-4"
            >
              <legend className="px-2 text-sm font-semibold text-teal-800">
                Skill group {index + 1}
              </legend>

              <div className="space-y-4">
                <label className="block text-sm font-semibold">
                  Category
                  <input
                    value={group.category}
                    maxLength={80}
                    className={inputClass}
                    placeholder="Languages / Frameworks / Databases"
                    onChange={(event) =>
                      updateSkillGroup(group.id, {
                        category: event.target.value,
                      })
                    }
                  />
                </label>

                <label className="block text-sm font-semibold">
                  Skills
                  <input
                    value={group.skills.join(",")}
                    maxLength={600}
                    className={inputClass}
                    placeholder="Java, Python, TypeScript"
                    onChange={(event) =>
                      updateSkillGroup(group.id, {
                        skills: event.target.value.split(","),
                      })
                    }
                  />
                  <span className="mt-2 block text-xs font-normal text-stone-500">
                    Separate skills with commas.
                  </span>
                </label>

                <button
                  type="button"
                  className={removeClass}
                  onClick={() => removeSkillGroup(group.id)}
                >
                  Remove skill group {index + 1}
                </button>
              </div>
            </fieldset>
          ))}
        </div>

        {skillGroups.length >= 10 && (
          <p className="mt-3 text-xs text-stone-500">
            You can add up to 10 skill groups.
          </p>
        )}
      </section>
    </>
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

export function ResumeExperiencePreview({
  entries,
}: {
  entries: ResumeExperience[];
}) {
  const visibleEntries = entries.filter(
    (entry) =>
      entry.company.trim() ||
      entry.role.trim() ||
      entry.bullets.some((bullet) => bullet.trim()),
  );

  if (visibleEntries.length === 0) return null;

  return (
    <section className="mt-6">
      <h3 className="border-b border-stone-200 pb-2 text-xs font-bold uppercase tracking-widest text-teal-800">
        Work experience
      </h3>

      <div className="mt-3 space-y-4">
        {visibleEntries.map((entry) => {
          const heading = [entry.role.trim(), entry.company.trim()]
            .filter(Boolean)
            .join(" — ");

          const dates = [
            formatMonth(entry.startDate),
            entry.currentlyWorking
              ? "Present"
              : formatMonth(entry.endDate),
          ]
            .filter(Boolean)
            .join(" – ");

          const details = [entry.location.trim(), dates]
            .filter(Boolean)
            .join(" | ");

          const bullets = entry.bullets
            .map((bullet) => bullet.trim())
            .filter(Boolean);

          return (
            <div key={entry.id}>
              {heading && (
                <p className="text-sm font-bold">{heading}</p>
              )}

              {details && (
                <p className="mt-1 text-xs text-stone-600">
                  {details}
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

export function ResumeSkillsPreview({
  groups,
}: {
  groups: ResumeSkillGroup[];
}) {
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      skills: group.skills
        .map((skill) => skill.trim())
        .filter(Boolean),
    }))
    .filter((group) => group.skills.length > 0);

  if (visibleGroups.length === 0) return null;

  return (
    <section className="mt-6">
      <h3 className="border-b border-stone-200 pb-2 text-xs font-bold uppercase tracking-widest text-teal-800">
        Skills
      </h3>

      <div className="mt-3 space-y-2 text-sm leading-6">
        {visibleGroups.map((group) => (
          <p key={group.id}>
            {group.category.trim() && (
              <span className="font-semibold">
                {group.category.trim()}:{" "}
              </span>
            )}
            {group.skills.join(", ")}
          </p>
        ))}
      </div>
    </section>
  );
}