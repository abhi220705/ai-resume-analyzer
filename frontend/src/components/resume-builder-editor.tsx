"use client";

import { useState } from "react";
import Link from "next/link";
import { ResumeBuilderAi } from "@/components/resume-builder-ai";
import dynamic from "next/dynamic";
import { ResumeBuilderDrafts } from "@/components/resume-builder-drafts";
import {
  ResumeBuilderAchievements,
  ResumeAchievementsPreview,
} from "@/components/resume-builder-achievements";
import { ResumeBuilderPhoto } from "@/components/resume-builder-photo";
import {
  ResumeBuilderExperienceSkills,
  ResumeExperiencePreview,
  ResumeSkillsPreview,
} from "@/components/resume-builder-experience-skills";
import {
  ResumeBuilderProjects,
  ResumeProjectsPreview,
} from "@/components/resume-builder-projects";
import {
  ResumeBuilderEducation,
  ResumeEducationPreview,
} from "@/components/resume-builder-education";
import {
  createEmptyResume,
  type ResumePersonalDetails,
} from "@/lib/resume-builder";

const ResumeBuilderPdf = dynamic(
  () => import("@/components/resume-builder-pdf"),
  {
    ssr: false,
    loading: () => (
      <p role="status" className="mb-6 text-sm text-stone-600">
        Loading PDF tools...
      </p>
    ),
  },
);

type Props = {
  initialName: string;
  initialEmail: string;
};

const inputClass =
  "mt-2 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100";

type PersonalField = {
  key: Exclude<keyof ResumePersonalDetails, "summary">;
  label: string;
  placeholder: string;
  type?: "text" | "email" | "tel" | "url";
  maxLength: number;
};

const fields: PersonalField[] = [
  {
    key: "fullName",
    label: "Full name",
    placeholder: "Your full name",
    maxLength: 100,
  },
  {
    key: "headline",
    label: "Professional headline",
    placeholder: "Information Technology Student",
    maxLength: 150,
  },
  {
    key: "email",
    label: "Email",
    placeholder: "you@example.com",
    type: "email",
    maxLength: 254,
  },
  {
    key: "phone",
    label: "Phone",
    placeholder: "+91 98765 43210",
    type: "tel",
    maxLength: 30,
  },
  {
    key: "location",
    label: "Location",
    placeholder: "Mumbai, India",
    maxLength: 150,
  },
  {
    key: "linkedin",
    label: "LinkedIn URL",
    placeholder: "https://www.linkedin.com/in/yourname",
    type: "url",
    maxLength: 500,
  },
  {
    key: "github",
    label: "GitHub URL",
    placeholder: "https://github.com/yourname",
    type: "url",
    maxLength: 500,
  },
  {
    key: "portfolio",
    label: "Portfolio URL",
    placeholder: "https://yourwebsite.com",
    type: "url",
    maxLength: 500,
  },
];

export function ResumeBuilderEditor({
  initialName,
  initialEmail,
}: Props) {
  const [resume, setResume] = useState(() =>
    createEmptyResume(initialName, initialEmail),
  );

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [mobileView, setMobileView] = useState<"edit" | "preview">(
    "edit",
  );

  function updatePersonal(
    field: keyof ResumePersonalDetails,
    value: string,
  ) {
    setResume((current) => ({
      ...current,
      personal: {
        ...current.personal,
        [field]: value,
      },
    }));
  }

  const personal = resume.personal;

  const contactDetails = [
    personal.email,
    personal.phone,
    personal.location,
  ].filter((value) => value.trim());

  const profileLinks = [
    { label: "LinkedIn", value: personal.linkedin },
    { label: "GitHub", value: personal.github },
    { label: "Portfolio", value: personal.portfolio },
  ].filter((link) => link.value.trim());

  return (
    <main className="ui-page">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard" className="ui-button">
          Back to dashboard
        </Link>

        <span className="rounded-full bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          Save your changes before leaving
        </span>
      </div>

      <ResumeBuilderDrafts
        resume={resume}
        photo={photoPreview}
        onLoad={(data, photo) => {
          setResume(data);
          setPhotoPreview(photo);
        }}
      />

      <ResumeBuilderPdf resume={resume} photo={photoPreview} />

      <ResumeBuilderAi resume={resume} onChange={setResume} />

      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-800">
          Your career workspace
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          AI Resume Builder
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Start with your personal details. Use information you want
          to share with employers.
        </p>
      </header>

      <div
        className="mb-5 flex gap-2 lg:hidden"
        role="group"
        aria-label="Editor view"
      >
        <button
          type="button"
          aria-pressed={mobileView === "edit"}
          onClick={() => setMobileView("edit")}
          className={
            mobileView === "edit"
              ? "ui-button ui-button-primary"
              : "ui-button"
          }
        >
          Edit details
        </button>

        <button
          type="button"
          aria-pressed={mobileView === "preview"}
          onClick={() => setMobileView("preview")}
          className={
            mobileView === "preview"
              ? "ui-button ui-button-primary"
              : "ui-button"
          }
        >
          Preview resume
        </button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="personal-details-heading"
          className={`min-w-0 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 ${
            mobileView === "edit" ? "block" : "hidden"
          } lg:block`}
        >
          <label className="block text-sm font-semibold">
            Resume name
            <input
              value={resume.title}
              maxLength={100}
              onChange={(event) =>
                setResume((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              className={inputClass}
              placeholder="My software developer resume"
            />
          </label>

          <p className="mt-2 text-xs text-stone-500">
            This name is for organising your resume. It will not
            appear in the resume itself.
          </p>

          <div className="my-6 border-t border-stone-200" />

          <h2
            id="personal-details-heading"
            className="text-xl font-semibold"
          >
            Personal details
          </h2>

          <p className="mt-2 text-sm leading-6 text-stone-600">
            Your name and email are filled from your account.
            Editing them here does not change your account.
          </p>

          <ResumeBuilderPhoto
            value={photoPreview}
            showOnResume={resume.photo.showOnResume}
            onChange={setPhotoPreview}
            onShowChange={(showOnResume) =>
              setResume((current) => ({
                ...current,
                photo: {
                  ...current.photo,
                  showOnResume,
                },
              }))
            }
          />

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {fields.map((field) => (
              <label
                key={field.key}
                className="block min-w-0 text-sm font-semibold"
              >
                {field.label}
                <input
                  type={field.type ?? "text"}
                  name={field.key}
                  value={personal[field.key]}
                  maxLength={field.maxLength}
                  placeholder={field.placeholder}
                  onChange={(event) =>
                    updatePersonal(field.key, event.target.value)
                  }
                  className={inputClass}
                />
              </label>
            ))}
          </div>

          <label className="mt-6 block text-sm font-semibold">
            Professional summary
            <textarea
              name="summary"
              value={personal.summary}
              maxLength={1500}
              rows={6}
              onChange={(event) =>
                updatePersonal("summary", event.target.value)
              }
              className={inputClass}
              placeholder="Describe your background, relevant skills, and the type of work you are looking for."
            />
          </label>

          <div className="mt-2 flex justify-between gap-3 text-xs text-stone-500">
            <span>
              Aim for 2–4 concise sentences based on your experience.
            </span>
            <span className="shrink-0">
              {personal.summary.length}/1500
            </span>
          </div>

          <ResumeBuilderAchievements
            entries={resume.achievements}
            onChange={(achievements) =>
              setResume((current) => ({
                ...current,
                achievements,
              }))
            }
          />

          <ResumeBuilderExperienceSkills
            experience={resume.experience}
            skillGroups={resume.skillGroups}
            onExperienceChange={(experience) =>
              setResume((current) => ({
                ...current,
                experience,
              }))
            }
            onSkillsChange={(skillGroups) =>
              setResume((current) => ({
                ...current,
                skillGroups,
              }))
            }
          />

          <ResumeBuilderProjects
            entries={resume.projects}
            onChange={(projects) =>
              setResume((current) => ({
                ...current,
                projects,
              }))
            }
          />

          <ResumeBuilderEducation
            entries={resume.education}
            onChange={(education) =>
              setResume((current) => ({
                ...current,
                education,
              }))
            }
          />
        </section>

        <section
          aria-labelledby="preview-heading"
          className={`min-w-0 ${
            mobileView === "preview" ? "block" : "hidden"
          } lg:sticky lg:top-6 lg:block`}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2
              id="preview-heading"
              className="text-lg font-semibold"
            >
              Live preview
            </h2>

            <span className="text-xs text-stone-500">
              Classic layout
            </span>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-100 p-3 sm:p-5">
            <article
              aria-label="Resume preview"
              className="min-h-[620px] break-words bg-white p-6 text-stone-900 shadow-sm sm:p-9"
            >
              <header className="border-b-2 border-teal-800 pb-5">
                {resume.photo.showOnResume && photoPreview && (
                  <img
                    src={photoPreview}
                    alt="Profile photo"
                    width={88}
                    height={88}
                    className="mb-4 h-22 w-22 rounded-lg object-cover"
                  />
                )}
                <h2 className="text-2xl font-bold tracking-tight">
                  {personal.fullName.trim() || "Your name"}
                </h2>

                {personal.headline.trim() && (
                  <p className="mt-2 text-sm font-medium text-teal-800">
                    {personal.headline}
                  </p>
                )}

                {contactDetails.length > 0 && (
                  <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-stone-600">
                    {contactDetails.join(" • ")}
                  </p>
                )}

                {profileLinks.length > 0 && (
                  <div className="mt-2 space-y-1 text-xs leading-5 text-stone-600">
                    {profileLinks.map((link) => (
                      <p key={link.label}>
                        <span className="font-semibold">
                          {link.label}:
                        </span>{" "}
                        {link.value}
                      </p>
                    ))}
                  </div>
                )}
              </header>

              {personal.summary.trim() ? (
                <section className="mt-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-teal-800">
                    Professional summary
                  </h3>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                    {personal.summary}
                  </p>
                </section>
              ) : (
                <p className="mt-8 text-sm leading-6 text-stone-400">
                  Add a professional summary to see it here.
                </p>
              )}
              <ResumeEducationPreview entries={resume.education} />
              <ResumeExperiencePreview entries={resume.experience} />
              <ResumeProjectsPreview entries={resume.projects} />
              <ResumeSkillsPreview groups={resume.skillGroups} />
              <ResumeAchievementsPreview entries={resume.achievements} />
            </article>
          </div>

          <p className="mt-3 text-xs leading-5 text-stone-500">
            This is the initial screen preview. PDF pagination and
            export will be added in a later step.
          </p>
        </section>
      </div>
    </main>
  );
}