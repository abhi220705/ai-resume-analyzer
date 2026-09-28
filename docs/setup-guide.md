# Phase 1 setup guide

## What and why

We are setting up a shared npm-workspaces repository with a Next.js frontend and a separate Express backend. Workspaces let one installation command manage both applications. Separate applications preserve our planned REST API architecture.

The only feature is a connection check. Establishing this working baseline lets us diagnose environment problems before adding database and authentication complexity.

## Structure

| Location | Purpose |
| --- | --- |
| frontend/src/app | Next.js pages, root layout, and styles |
| frontend/.env.local | Local public API URL; ignored by Git |
| backend/src/app.ts | Constructs the Express app and health endpoint |
| backend/src/server.ts | Validates startup settings and opens the HTTP port |
| backend/.env | Local backend configuration; ignored by Git |
| docs | Setup, architecture, and project state |
| package.json | Workspace definitions and shared commands |
| package-lock.json | Exact resolved dependency tree |

## Step 1: Install tools on Windows

Install the current Node.js 24 LTS Windows installer from https://nodejs.org/en/download. Keep npm and PATH integration enabled. Install Git for Windows from https://git-scm.com/downloads and VS Code from https://code.visualstudio.com/download.

Close and reopen terminals after installation. Open Git Bash and run:

```bash
node --version
npm --version
git --version
```

Node must report `v24.x.x`. The project intentionally restricts the Node major version so teammates use the same runtime family. If using a Node version manager, `.nvmrc` selects major version 24; Windows users do not need a version manager just to run this project.

No PostgreSQL, Gemini key, or cloud account is needed for Phase 1. We configure PostgreSQL in Phase 2.

## Step 2: Extract and open the starter

Extract the downloaded archive to a normal local folder, for example `C:/Projects`. Open Git Bash inside the extracted `ai-resume-analyzer` folder. Confirm that `ls` shows `frontend`, `backend`, and `package.json`.

```bash
pwd
ls
code .
```

If `code` is unavailable, open VS Code manually and use File > Open Folder.

## Step 3: Install the supplied dependencies

Run all commands below from the project root:

```bash
npm ci
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

Only copy environment templates on first setup; repeating the copy overwrites local values. No real secrets are required yet.

The manifests contain exact direct dependency versions; the lockfile also fixes transitive dependencies. Do not run `create-next-app` inside this project or create separate lockfiles inside each workspace.

## Step 4: Run both applications

Terminal 1, project root:

```bash
npm run dev:backend
```

Terminal 2, project root:

```bash
npm run dev:frontend
```

Open http://localhost:3000. Click **Check backend connection**. Expect a green confirmation. Open http://localhost:4000/api/health to inspect JSON directly.

The API returns success=true, data.status="ok", and data.service="resume-analyzer-api". A nonexistent API route returns HTTP 404 with our error response shape.

The web page checks the API in the browser. CORS permits our configured frontend origin. Requests stop after five seconds if the backend does not respond.

## Step 5: Verify the baseline

Stop development processes with Ctrl+C before running a production build in the same folder:

```bash
npm run typecheck
npm run build
```

Type checking catches TypeScript mistakes without relying on clicking every page. The build confirms the frontend and backend can compile. Production deployment and production secret management are later phases.

## Step 6: Create the shared GitHub repository

Only ONE team member performs the initial repository setup. The other two clone it afterward.

Create an empty repository named `ai-resume-analyzer` on GitHub. Do not initialize it with a README, .gitignore, or license because the starter already contains files. Private is appropriate during initial development; public release can come later.

Set your own commit identity locally. Replace placeholders before running:

```bash
git init -b main
git config user.name "YOUR NAME"
git config user.email "YOUR GITHUB EMAIL OR NOREPLY EMAIL"
git add .
git status
```

Inspect staged files. You should see source, docs, `.env.example` files, and `package-lock.json`. You should NOT see `node_modules`, `.next`, `dist`, `.env`, or `.env.local`.

After that check:

```bash
git commit -m "chore: initialize phase 1 frontend and backend"
git remote add origin https://github.com/YOUR_USERNAME/ai-resume-analyzer.git
git push -u origin main
git switch -c develop
git push -u origin develop
```

Replace YOUR_USERNAME with the repository owner's username. Authenticate through Git's normal credential-manager/browser flow if requested. Do not put a password or token in a command or remote URL. Add teammates as collaborators through GitHub settings.

No GitHub repository has been created or pushed by this starter package.

## Step 7: Other teammates clone

```bash
git clone https://github.com/OWNER/ai-resume-analyzer.git
cd ai-resume-analyzer
git switch develop
npm ci
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

Replace OWNER. Each teammate configures their own Git name/email and runs the frontend/backend commands above.

## Daily team workflow

Begin with a clean working tree, then create one branch per feature:

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feature/your-feature
```

Make a small coherent change, inspect it, and commit only intended files:

```bash
git diff
git add path/to/changed-file
git commit -m "feat: describe the completed change"
git push -u origin feature/your-feature
```

Open a pull request targeting `develop`. Another member reviews it. Check types/build and the affected behavior before merging. Merge tested milestones from `develop` into `main`.

If your feature branch falls behind, with local changes committed:

```bash
git fetch origin
git merge origin/develop
```

For conflicts, read both versions with the file owner, edit to the intended combined result, remove conflict markers, run checks, then stage the resolved files and commit. Do not blindly accept all changes from either side. Avoid force pushing shared branches.

If package-lock.json conflicts, first resolve package.json intentionally, then run `npm install` once from the root to regenerate the consistent lock and inspect the resulting diff.

## Important implementation concepts

- `app.ts` constructs the app; `server.ts` starts it. Later API tests can import the app without opening a network port.
- Backend ESM TypeScript imports use `.js` because the compiled files run as JavaScript.
- `node --watch --import tsx` restarts the development backend on edits and loads TypeScript; `tsc` produces the build.
- Node's `--env-file=.env` loads backend settings. Next.js loads frontend `.env.local`.
- `NEXT_PUBLIC_API_URL` is intentionally public. Database URLs, JWT secrets, and Gemini keys must never use that prefix.
- Helmet adds baseline HTTP headers. CORS controls allowed browser origins. Neither replaces authentication, input validation, or ownership checks.
- No credentials or cookies are sent by the health check. Authentication-specific CORS/cookie settings will be designed in Phase 4.
- Shutdown handling stops the backend cleanly when possible.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| node or npm not found | Reinstall Node with PATH enabled and reopen Git Bash |
| EBADENGINE | Use Node 24 LTS, then rerun npm ci |
| npm ci cannot find lockfile | You are in the wrong directory or did not fully extract the ZIP |
| Environment file missing | Run the matching cp command once from the root |
| Backend port already in use | Stop your previous backend process; do not terminate unrelated applications |
| Frontend starts on port 3001 | Free port 3000 or intentionally update FRONTEND_URL and restart the backend |
| Connection check fails | Open /api/health directly, verify both processes and exact localhost URLs |
| Changed API URL has no effect | Restart the frontend after changing .env.local |
| CORS error | Use localhost consistently, not a mixture of localhost and 127.0.0.1 |
| Git says remote origin exists | Inspect git remote -v; do not blindly overwrite a different repository |
| Git push says src refspec main does not match | Confirm the initial commit exists and git branch --show-current says main |

## Phase 1 completion checklist

- All three members can run Node/npm/Git.
- All can install with npm ci.
- Frontend is visible on port 3000.
- Backend health JSON is visible on port 4000.
- Browser connection check succeeds.
- Type checking and build succeed.
- One shared repository contains main and develop; teammates have access.
- No private environment files are tracked.

Send the terminal error or a screenshot if a step fails. Resolve it before Phase 2.
