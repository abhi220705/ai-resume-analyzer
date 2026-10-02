import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-12">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-16">
        <p className="text-sm font-bold tracking-widest text-indigo-600">
          AI RESUME ANALYZER
        </p>

        <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
          Your next opportunity starts with a stronger resume.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          A platform for candidates and recruiters. Create your account
          today as we build resume analysis, explainable job matching,
          and application tracking.
        </p>

        <div className="mt-9 flex flex-wrap gap-4">
          <Link
            href="/register"
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            Create an account
          </Link>

          <Link
            href="/login"
            className="rounded-xl border border-slate-300 px-6 py-3 font-semibold hover:bg-slate-50"
          >
            Log in
          </Link>
        </div>

        <div className="mt-12 grid gap-5 border-t border-slate-200 pt-8 sm:grid-cols-2">
          <div>
            <h2 className="font-bold">For candidates</h2>
            <p className="mt-2 leading-7 text-slate-600">
              Build your profile and prepare for upcoming resume
              analysis and job discovery tools.
            </p>
          </div>

          <div>
            <h2 className="font-bold">For recruiters</h2>
            <p className="mt-2 leading-7 text-slate-600">
              Create your account ahead of company profiles, job
              posting, and applicant management.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}