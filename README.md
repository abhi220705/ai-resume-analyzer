# AI Resume Analyzer & Job Match Platform

A full-stack recruitment project for candidates, recruiters, and administrators. Candidates can upload PDF resumes, extract text, run explainable analysis, compare skills against jobs, and track applications. Recruiters manage their company, jobs, and received applications; administrators review platform activity and company verification.

**Branch status:** This guide describes the implemented application on [`develop`](https://github.com/abhi220705/ai-resume-analyzer/tree/develop), including merged [Phase 24 deployment work (#22)](https://github.com/abhi220705/ai-resume-analyzer/pull/22). At this documentation review, `main` contains older application code and is not synchronized with `develop`. Use `develop` for the setup below; updating this README does not merge application code between branches.

## Implemented features

- **Authentication:** candidate/recruiter signup, bcrypt password hashing, JWT access tokens, rotating database-backed refresh sessions, logout, protected routes, and role checks. Public signup cannot create administrators.
- **Profiles and companies:** candidate profile editing, recruiter profiles, company creation/editing, and administrator-controlled verification status.
- **Resumes:** authenticated PDF upload/history, private file storage, text extraction with `pdf-parse`, persisted parse status, and saved rule-based analysis with detected skills and improvement suggestions.
- **Jobs and matching:** recruiter job management, candidate browsing, and explained required/preferred skill coverage. Required skills contribute 80% and preferred skills 20%; required skills contribute 100% when no preferred skills are specified.
- **Applications and dashboards:** candidate applications and withdrawal, recruiter application review/status updates, candidate/recruiter overviews, and administrator statistics, user/company lists, and activity views.
- **OCR and integrity:** English OCR through Tesseract.js, stored OCR text/confidence/status, and on-demand comparison of extracted text with OCR text.
- **Deployment support:** Vercel frontend API rewrites, signed authentication proxy identity, and Supabase-backed resume storage.

Despite the project name, **resume analysis and job matching are deterministic rules, not an LLM or trained hiring model**. The unfinished AI feedback schema was removed in [PR #17](https://github.com/abhi220705/ai-resume-analyzer/pull/17). No Gemini/OpenAI key is required. Scores measure the implemented rubric or skill mentions, not hiring probability. Integrity differences are review signals, not proof of cheating; the comparison does not inspect font visibility or text positioning. OCR is stored separately and is not an automatic replacement for the extracted text used by analysis/matching.

## Deployed application

| Service | URL | Verification on 2026-10-27 |
| --- | --- | --- |
| Frontend (Vercel) | https://ai-resume-analyzer-pink-psi.vercel.app | HTTP 200; page title `AI Resume Analyzer` |
| Backend liveness (Render) | https://ai-resume-analyzer-api-8s2b.onrender.com/api/health | HTTP 200; `status: ok`, `service: resume-analyzer-api` |
| Database readiness | https://ai-resume-analyzer-api-8s2b.onrender.com/api/health/ready | HTTP 200; `database: connected` |

These are point-in-time checks, not an uptime guarantee or a fresh end-to-end test of signup, storage, parsing, and OCR. `/api/health` checks the backend process; `/api/health/ready` runs a database query. Neither checks Supabase Storage. The recorded deployment uses Vercel for the frontend, Render for the backend, and Supabase for PostgreSQL and private file storage. Hosting settings are managed outside this repository.

## Stack and layout

- Node.js **24.x** (`>=24 <25`), npm workspaces, TypeScript.
- Frontend: Next.js 16, React 19, Tailwind CSS 4, Three.js.
- Backend: Express 5, Prisma 7 with the PostgreSQL adapter, Zod, bcrypt, JWT, Helmet, and rate limiting.
- Documents: `pdf-parse`, Tesseract.js; local filesystem or Supabase Storage.

| Path | Purpose |
| --- | --- |
| `frontend/src/app/` | Home, auth, dashboard, jobs, matches, applications, recruiter, and admin pages |
| `frontend/src/components/` | Shared UI and feature components |
| `frontend/src/proxy.ts`, `frontend/next.config.ts` | Production authentication proxy and API rewrites |
| `backend/src/routes/` | HTTP API routes |
| `backend/src/lib/` | Database, tokens, storage, parsing, OCR, analysis, matching, and integrity logic |
| `backend/prisma/schema.prisma`, `backend/prisma/migrations/` | PostgreSQL schema and committed migrations |
| `backend/prisma7.config.ts` | Prisma CLI configuration; pass it explicitly |
| `backend/tests/` | Core, API smoke, and optional ownership tests |

## Local setup

### 1. Prerequisites and checkout

Install Git, Node.js 24.x (with npm), and PostgreSQL, or provision a separate development PostgreSQL database. You need credentials with permission to create the application's tables and apply migrations. Supabase Storage is optional locally.

```bash
git clone https://github.com/abhi220705/ai-resume-analyzer.git
cd ai-resume-analyzer
git switch develop
node --version
npm --version
npm ci
```

Repository access may require GitHub authentication. Use the root lockfile and `npm ci`; do not install separate dependency trees inside the workspaces. In Windows PowerShell, use `npm.cmd` instead of `npm` if script execution policy blocks `npm.ps1`.

### 2. Create environment files

From the repository root, in Git Bash/macOS/Linux:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Or in PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

Edit `backend/.env` with your development database credentials:

```dotenv
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000
DATABASE_URL="postgresql://resume_app:YOUR_ENCODED_PASSWORD@localhost:5432/ai_resume_analyzer?schema=public"
JWT_ACCESS_SECRET=REPLACE_WITH_GENERATED_64_CHARACTER_HEX_VALUE
RESUME_STORAGE_PROVIDER=local
```

Create the database and login before applying migrations. The example username/database are placeholders, not automatically provisioned accounts. Percent-encode special characters in the database password when putting it in a URI.

Generate a fresh JWT secret and paste its output into `JWT_ACCESS_SECRET`:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

`frontend/.env.local` for direct local API access:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Use `localhost` consistently in both browser and configuration. `FRONTEND_URL` must be an exact origin without a trailing slash. Leave `BACKEND_URL`, `PROXY_SIGNING_SECRET`, and `VERCEL` unset for this direct local setup.

### 3. Generate Prisma Client and apply migrations

Run from the backend directory so the Prisma config and `.env` resolve correctly:

```bash
cd backend
npx prisma generate --config prisma7.config.ts
npx prisma migrate deploy --config prisma7.config.ts
npx prisma migrate status --config prisma7.config.ts
cd ..
```

In PowerShell, `npx.cmd` can be used in place of `npx`. Prisma Client is generated into `backend/src/generated/prisma/` and is not committed. Regenerate it after schema changes. `migrate deploy` applies existing migrations; use `migrate dev` only when intentionally authoring a new migration against a development database. Do not reset a deployed database to set up a local checkout.

There are 12 committed migrations at this review, including creation and later removal of the unfinished AI feedback schema. Apply the complete history. Current models include users, refresh sessions, candidate/recruiter profiles, resumes, analyses, companies, jobs, and applications.

### 4. Start both services

Terminal 1, from the repository root:

```bash
npm run dev:backend
```

Terminal 2, from the same root:

```bash
npm run dev:frontend
```

Open http://localhost:3000. Check http://localhost:4000/api/health and http://localhost:4000/api/health/ready. Register separate candidate/recruiter accounts to explore the respective workflows. Stop each process with Ctrl+C.

### Optional: create an administrator

Public registration deliberately rejects the `ADMIN` role. To create a separate administrator account, temporarily add `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` to the ignored `backend/.env`, then run from `backend/`:

```bash
node --env-file=.env --import tsx src/scripts/create-admin.ts
```

Use a unique email and a password accepted by the signup validator. The script creates a new account; it does not promote an existing email. Remove the temporary admin credentials from the file afterward. There are no documented default admin credentials.

## Environment reference

The checked-in `.env.example` files cover the basic local setup only. Add the deployment/storage variables below when using those features.

| Variable | Location | Requirement |
| --- | --- | --- |
| `NODE_ENV` | Backend | `development` locally; `production` enables secure refresh cookies |
| `PORT` | Backend | Defaults to `4000`; hosting may inject its own port |
| `FRONTEND_URL` | Backend | Required exact allowed frontend origin, including scheme, no trailing slash |
| `DATABASE_URL` | Backend / Prisma CLI | Required PostgreSQL connection URI; configure TLS as required by your provider |
| `JWT_ACCESS_SECRET` | Backend | Required 64-character hexadecimal secret |
| `RESUME_STORAGE_PROVIDER` | Backend | `local` (default) or `supabase` |
| `SUPABASE_URL` | Backend | Required when using Supabase Storage; your project's API URL |
| `SUPABASE_SECRET_KEY` | Backend | Required for Supabase Storage; server-side secret with bucket access, never a browser variable |
| `SUPABASE_STORAGE_BUCKET` | Backend | Required for Supabase Storage; name of an existing private bucket (deployment uses `resumes`) |
| `NEXT_PUBLIC_API_URL` | Frontend | `http://localhost:4000` for direct local requests; `/` for deployed same-origin requests |
| `BACKEND_URL` | Frontend server/build | Render backend origin for API rewrites, without `/api`; required for the deployed proxy |
| `PROXY_SIGNING_SECRET` | Both servers | Same private secret on Vercel and Render, at least 32 characters; use a separately generated random secret |
| `VERCEL` | Frontend hosting | Hosting-provided `1` activates signed auth proxy behavior; do not set manually for ordinary local development |
| `TEST_API_URL` | API test process | Optional API origin; defaults to `http://localhost:4000` |
| `OWNERSHIP_TEST_PDF` | Ownership test process | Absolute path to a non-sensitive test PDF for the optional ownership test |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin provisioning only | Temporary credentials consumed by `create-admin.ts` |

Never commit real environment files, passwords, tokens, or private resumes. `NEXT_PUBLIC_*` values are public. Keep database credentials, Supabase secrets, JWT secrets, and proxy secrets server-side. Supabase provides database/storage here; authentication is implemented by this Express application, not Supabase Auth.

## File storage and document limits

- **Local:** resume files are created under `backend/storage/resumes/`; the directory is created automatically and ignored by Git. The backend needs write permission. Keep this directory and its database records together when backing up a local installation.
- **Supabase:** create a **private** bucket before uploading, configure the three `SUPABASE_*` variables, and set `RESUME_STORAGE_PROVIDER=supabase`. The code does not provision the bucket. Allow `application/pdf` and a file size limit compatible with the application's 5 MiB limit. Do not make resumes public to fix access errors.
- Switching providers does not migrate existing files. Database storage keys must correspond to files in the selected provider.
- PDF uploads are limited to **5 MiB**. Text extraction supports up to **10 pages** and **100,000 characters**, with bounded workers/timeouts.
- OCR supports **1–5 pages**, English text, and **100,000 characters**, with one OCR process per backend instance. Initial language-data download needs internet access, and `backend/storage/ocr-cache/` must be writable even when resumes use Supabase Storage.
- Image-only PDFs may produce `NO_TEXT` during ordinary extraction. OCR can fail or require review due to document quality, timeouts, memory limits, or incomplete coverage. It is not a durable external job queue.

## Deployment configuration

The recorded Phase 24 setup deploys `develop` on both services. Confirm the branch and environment scope in each hosting dashboard when deploying a new copy.

### Render backend

- Repository root directory: leave empty.
- Runtime: Node 24 (the recorded deployment sets `NODE_VERSION=24`).
- Build command:

```bash
npm ci --include=dev && npm exec --workspace backend -- prisma generate --config prisma7.config.ts && npm run build --workspace backend
```

- Start command:

```bash
npm run start --workspace backend
```

Set backend variables from the table: production mode, the Vercel origin, PostgreSQL URI, JWT secret, Supabase provider/bucket credentials, and the shared proxy secret. Allow Render to supply `PORT`. Use persistent Supabase Storage for deployed resumes rather than relying on the backend instance's local disk.

The build command **does not apply database migrations**. Apply committed migrations deliberately to the intended database before deploying code that requires them. For an ignored `backend/.env.production`, run from `backend/`:

```bash
node --env-file=.env.production ../node_modules/prisma/build/index.js migrate deploy --config prisma7.config.ts
node --env-file=.env.production ../node_modules/prisma/build/index.js migrate status --config prisma7.config.ts
```

The recorded Supabase connection uses the project's session-pooler PostgreSQL URI on port `5432`. Copy your own connection details from Supabase and use your actual, URI-encoded database password; the Storage secret is not the database password.

### Vercel frontend

- Root directory: `frontend`; framework: Next.js.
- Use the workspace's Next.js build (`npm run build` in the frontend workspace).
- Set these variables in the environment being deployed:

```dotenv
NEXT_PUBLIC_API_URL=/
BACKEND_URL=https://ai-resume-analyzer-api-8s2b.onrender.com
PROXY_SIGNING_SECRET=YOUR_SHARED_PRIVATE_PROXY_SECRET
```

For another deployment, replace the backend origin. Set Render's `FRONTEND_URL` to that frontend's exact production origin. Redeploy after changing build-time frontend variables. `next.config.ts` rewrites `/api/*`; `src/proxy.ts` signs authentication requests on Vercel so the backend can verify the forwarded client identity for auth rate limiting. Use the same proxy secret on both services. An arbitrary preview origin is not automatically permitted by the backend's origin check.

## Verification

From the root after dependency installation, environment setup, and Prisma generation:

```bash
npm run typecheck
npm run build
npm test
```

`npm test` runs `backend/tests/core.test.ts` (matching, skill detection, integrity, signup validation, pagination, and authorization middleware). It is not a full browser or deployment test.

With the backend running and the database migrated, run in another terminal:

```bash
npm run test:api
# Or run core tests followed by API smoke tests:
npm run test:all
```

API tests check health/readiness, missing/invalid authentication, validation, error responses, and empty-session refresh. They default to localhost and do not prove complete candidate/recruiter workflows. Repeated runs can encounter authentication rate limits.

The separate ownership test is **not included** in those scripts. It hard-codes `http://localhost:4000`, creates two accounts and a resume, and does not clean them up. Use a disposable development database/storage and set `OWNERSHIP_TEST_PDF` to a safe PDF, then run from the root:

```bash
node --import tsx --test backend/tests/ownership.test.ts
```

Before a release, manually check signup/login/logout and session restoration; candidate profile and upload/parse/analysis; OCR/integrity; recruiter company/job management; application submission and status changes; admin authorization/verification; and persistence after restart. A green health response alone does not verify these workflows.

## Troubleshooting and documentation status

- **Database readiness fails:** check the database service, URI/password/TLS requirements, and applied migrations. Liveness can still return 200 while the database is unavailable.
- **Authentication origin rejected:** compare the browser origin with `FRONTEND_URL`, including scheme and port. Do not add a trailing slash.
- **Deployed authentication returns 503:** check Vercel's `BACKEND_URL`, private `PROXY_SIGNING_SECRET`, and proxy configuration; verify that Render has the matching secret.
- **Upload/storage failure:** confirm provider selection, private bucket existence, and backend storage credentials. Changing the provider will not copy older files.
- **Unexpected response / 502:** check the direct backend health URL, then hosting logs. Startup, restarts, and proxy failures are possible; do not assume the database or application code is at fault without evidence.
- **Generated `next-env.d.ts` changes:** Next.js can switch generated type paths between development and build. Inspect the diff before committing unrelated generated changes.

`docs/setup-guide.md`, `docs/phase-1-source.md`, and `docs/project-state.md` are historical Phase 1 material, not an up-to-date feature inventory. This README supersedes their starter-only claims for the current `develop` application. Package scripts, source code, schema, and migrations remain the implementation reference. This documentation update does not claim a fresh full test-suite or browser-workflow run.
