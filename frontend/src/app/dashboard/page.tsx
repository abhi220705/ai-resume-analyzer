"use client";

import Link from "next/link";
import { PageHeading, Icon } from "@/components/ui";
import { RecruiterOverview } from "@/components/recruiter-overview";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { ResumeOcr } from "@/components/resume-ocr";
import { ResumeUpload } from "@/components/resume-upload";
import { authenticatedRequest, type User } from "@/lib/api";

type Profile = {
  phone: string | null;
  location: string | null;
  headline: string | null;
  bio: string | null;
  education: string | null;
  experience: string | null;
  skills: string[];
};
type ProfileForm = Record<keyof Profile, string>;

const emptyForm: ProfileForm = {
  phone: "", location: "", headline: "", bio: "",
  education: "", experience: "", skills: "",
};
const primary = "ui-button ui-button-primary";
const secondary = "ui-button";
const inputClass = "ui-input";

function toForm(profile: Profile | null): ProfileForm {
  return profile ? {
    phone: profile.phone ?? "", location: profile.location ?? "",
    headline: profile.headline ?? "", bio: profile.bio ?? "",
    education: profile.education ?? "", experience: profile.experience ?? "",
    skills: profile.skills.join(", "),
  } : { ...emptyForm };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  if (loading || !user) return <main className="ui-empty"><p role="status">Checking your session...</p></main>;
  return <DashboardContent key={user.id} user={user} />;
}

function DashboardContent({ user }: { user: User }) {
  const candidate = user.role === "CANDIDATE";
  const recruiter = user.role === "RECRUITER";
  return <main className="ui-page">
    <PageHeading eyebrow={candidate ? "Your career workspace" : recruiter ? "Your hiring workspace" : "Platform workspace"} title={`Welcome back, ${user.name}`} description={candidate ? "Make progress on your profile, your resume, and your next opportunity." : "Everything you need to review, organize, and move forward."} />
    {candidate ? <>
      <section className="workflow-banner" aria-label="Resume workflow">
        <div><h2>Your next opportunity starts with a clearer resume.</h2><p>Upload, understand, then compare. Take it one step at a time.</p><a href="#resume-tools" className="ui-button ui-button-primary mt-5">Open resume workspace <Icon name="arrow" /></a></div>
        <div className="workflow-steps"><div className="workflow-step"><span>01</span>Upload your PDF</div><div className="workflow-step"><span>02</span>Review your analysis</div><div className="workflow-step"><span>03</span>Compare job skills</div></div>
      </section>
      <div className="dashboard-shortcuts">
        <Link href="/jobs" className="shortcut"><Icon name="jobs" /><span><strong>Explore opportunities</strong><small>Browse published jobs</small></span></Link>
        <Link href="/matches" className="shortcut"><Icon name="match" /><span><strong>Compare your skills</strong><small>Understand job requirements</small></span></Link>
        <Link href="/applications" className="shortcut"><Icon name="applications" /><span><strong>Your applications</strong><small>Follow your progress</small></span></Link>
      </div>
      <details className="profile-disclosure" id="profile-editor"><summary><Icon name="overview" /><span><strong>Your candidate profile</strong><small>Manage your background, education, experience, and skills</small></span></summary><CandidateProfileEditor /></details>
      <section id="resume-tools" className="scroll-mt-6"><div className="section-caption"><Icon name="document" /><h2>Resume workspace</h2></div><ResumeUpload /></section>
      <section id="ocr-tools" className="scroll-mt-6"><div className="section-caption"><Icon name="scan" /><h2>OCR & text integrity</h2></div><p className="text-sm text-stone-600">Read PDF page images and review differences between text sources.</p><ResumeOcr /></section>
    </> : recruiter ? <>
      <div className="dashboard-shortcuts"><Link href="/jobs" className="shortcut"><Icon name="jobs" /><span><strong>Manage jobs</strong><small>Create and publish roles</small></span></Link><Link href="/applications" className="shortcut"><Icon name="applications" /><span><strong>Review applications</strong><small>Move candidates forward</small></span></Link><Link href="/recruiter" className="shortcut"><Icon name="company" /><span><strong>Your company</strong><small>Update your profile</small></span></Link></div>
      <RecruiterOverview />
    </> : <section className="ui-panel"><Icon name="admin" /><h2 className="mt-4">Your platform, at a glance</h2><p className="ui-description">Review companies, moderate jobs, and inspect platform activity.</p><Link href="/admin" className="ui-button ui-button-primary mt-5">Open administration <Icon name="arrow" /></Link></section>}
  </main>;
}

// Only mounted for candidates, so recruiter/admin visits never call /api/profile.
function CandidateProfileEditor() {
  const [form, setForm] = useState<ProfileForm>({ ...emptyForm });
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      setLoading(true);
      setReady(false);
      setError("");
      try {
        const result = await authenticatedRequest<{ profile: Profile | null }>("/api/profile");
        if (!active) return;
        setForm(toForm(result.profile));
        setReady(true);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load your profile.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProfile();
    return () => { active = false; };
  }, [reload]);

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSuccess("");
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await authenticatedRequest<{ profile: Profile }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          phone: form.phone.trim() || null,
          location: form.location.trim() || null,
          headline: form.headline.trim() || null,
          bio: form.bio.trim() || null,
          education: form.education.trim() || null,
          experience: form.experience.trim() || null,
          skills: form.skills.split(",").map((skill) => skill.trim()).filter(Boolean),
        }),
      });
      setForm(toForm(result.profile));
      setSuccess("Profile saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="profile" aria-labelledby="profile-heading" className="scroll-mt-6 rounded-xl border border-stone-200 bg-white">
      <div className="border-b border-stone-200 px-5 py-5 sm:px-6">
        <h2 id="profile-heading" className="text-xl font-semibold">Your profile</h2>
        <p className="mt-1 text-sm leading-6 text-stone-600">Add your background and skills. Save your changes before leaving this page.</p>
      </div>
      <div className="p-5 sm:p-6">
        {error && <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {success && <p role="status" className="mb-5 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">{success}</p>}
        {loading ? <p role="status" className="py-6 text-sm text-stone-600">Loading your profile...</p> : !ready ? (
          <button type="button" className={secondary} onClick={() => setReload((value) => value + 1)}>Retry loading profile</button>
        ) : (
          <form onSubmit={handleSave} aria-busy={saving}>
            <fieldset disabled={saving} className="min-w-0 space-y-5">
              <legend className="sr-only">Candidate profile details</legend>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-semibold">Phone
                  <input name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} maxLength={20} className={inputClass} placeholder="Your phone number" />
                </label>
                <label className="block text-sm font-semibold">Location
                  <input name="location" value={form.location} onChange={(e) => updateField("location", e.target.value)} maxLength={150} className={inputClass} placeholder="City, country" />
                </label>
              </div>
              <label className="block text-sm font-semibold">Headline
                <input name="headline" value={form.headline} onChange={(e) => updateField("headline", e.target.value)} maxLength={150} className={inputClass} placeholder="Information Technology Student" />
              </label>
              <label className="block text-sm font-semibold">About you
                <textarea name="bio" value={form.bio} onChange={(e) => updateField("bio", e.target.value)} maxLength={1000} rows={3} className={inputClass} placeholder="A short introduction to your interests and experience" />
              </label>
              <div className="grid gap-5 xl:grid-cols-2">
                <label className="block text-sm font-semibold">Education
                  <textarea name="education" value={form.education} onChange={(e) => updateField("education", e.target.value)} maxLength={500} rows={4} className={inputClass} placeholder="Degree, college, and graduation year" />
                </label>
                <label className="block text-sm font-semibold">Experience
                  <textarea name="experience" value={form.experience} onChange={(e) => updateField("experience", e.target.value)} maxLength={1000} rows={4} className={inputClass} placeholder="Projects, internships, or work experience" />
                </label>
              </div>
              <label className="block text-sm font-semibold">Skills
                <input name="skills" aria-describedby="skills-help" value={form.skills} onChange={(e) => updateField("skills", e.target.value)} maxLength={3000} className={inputClass} placeholder="Java, TypeScript, PostgreSQL, React" />
                <span id="skills-help" className="mt-2 block text-xs font-normal text-stone-500">Separate skills with commas.</span>
              </label>
              <div className="flex flex-wrap items-center gap-4 border-t border-stone-200 pt-5">
                <button type="submit" disabled={saving} className={primary}>{saving ? "Saving..." : "Save profile"}</button>
                <p className="text-xs text-stone-500">Changes are saved when you select Save profile.</p>
              </div>
            </fieldset>
          </form>
        )}
      </div>
    </section>
  );
}
