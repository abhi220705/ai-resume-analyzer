# AI Resume Analyzer & Job Match Platform

Phase 1: Development environment and repository setup.

This starter contains a real Next.js frontend and Express backend health check. Authentication, PostgreSQL, resume parsing, jobs, OCR, and AI are not implemented yet.

## Requirements

- Node.js 24 LTS (includes npm).
- Git for Windows and Git Bash, or Git and a terminal on macOS/Linux.
- VS Code or another editor.
- A GitHub account for each team member.

Official downloads: https://nodejs.org/en/download, https://git-scm.com/downloads, https://code.visualstudio.com/download.

## Run locally

Extract the ZIP first. Open Git Bash inside the extracted `ai-resume-analyzer` directory (the directory containing the root package.json).

```bash
node --version
npm --version
git --version
npm ci
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

Run the backend in terminal 1, from the project root:

```bash
npm run dev:backend
```

Run the frontend in terminal 2, from the same root:

```bash
npm run dev:frontend
```

Open http://localhost:3000 and click **Check backend connection**. The expected result is **Backend connected. Your development setup is ready.**

The API can also be opened at http://localhost:4000/api/health. This checks the backend process only; there is no database yet.

Stop either development process with Ctrl+C.

## Checks

Run from the project root, preferably with development processes stopped:

```bash
npm run typecheck
npm run build
```

The root package-lock.json records the resolved dependency tree. Commit it. Team members use `npm ci`, which installs that tree without updating versions.

See `docs/setup-guide.md` for detailed setup, troubleshooting, Git collaboration, and explanations. `docs/phase-1-source.md` contains complete authored configuration and source files for copying and study. `docs/project-state.md` records current progress.

## Important boundaries

- Never commit `.env`, private resumes, API keys, or database credentials.
- Frontend variables prefixed `NEXT_PUBLIC_` are public. Only the API URL belongs there now.
- CORS is a browser access policy, not authentication. Backend authorization will be implemented in Phase 4.
- Phase 1's API is only a foundation, not a production-ready recruitment service.

## Planned stack

Next.js / TypeScript / Tailwind, Express / TypeScript, PostgreSQL / Prisma, PDF.js, Tesseract.js, optional Gemini.

Database dependencies arrive in Phase 2. UI component and form packages arrive when their features need them.
