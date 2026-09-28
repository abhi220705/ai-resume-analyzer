# Phase 1 complete source reference

First follow setup-guide.md: install Node 24, extract the project, then run `npm ci` from the root. All required files are already supplied. This document reproduces complete authored code/configuration for study and copy-paste. The generated package-lock.json is supplied separately in the archive and should be kept unchanged.

## .gitattributes

```text
* text=auto eol=lf
```

## .gitignore

```text
node_modules/
.next/
dist/
coverage/
*.tsbuildinfo
.env
.env.*
!.env.example
backend/storage/
*.log
.DS_Store
Thumbs.db
```

## .npmrc

```text
save-exact=true
engine-strict=true
```

## .nvmrc

```text
24
```

## backend/.env.example

```text
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000
```

## backend/package.json

```json
{
  "name": "backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --watch --env-file=.env --import tsx src/server.ts",
    "build": "tsc",
    "start": "node --env-file=.env dist/server.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "cors": "2.8.6",
    "express": "5.2.1",
    "helmet": "8.3.0"
  },
  "devDependencies": {
    "@types/cors": "2.8.19",
    "@types/express": "5.0.6",
    "@types/node": "24.19.0",
    "tsx": "4.23.15",
    "typescript": "5.9.3"
  }
}
```

## backend/src/app.ts

```typescript
import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";

export function createApp(frontendOrigin: string) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: frontendOrigin }));

  app.get("/api/health", (_request, response) => {
    response.set("Cache-Control", "no-store").json({
      success: true,
      message: "Backend is running",
      data: { status: "ok", service: "resume-analyzer-api" },
    });
  });

  app.use((_request, response) => {
    response.status(404).json({ success: false, message: "Route not found", errors: [] });
  });

  const errorHandler: ErrorRequestHandler = (_error, _request, response, _next) => {
    response.status(500).json({ success: false, message: "Internal server error", errors: [] });
  };
  app.use(errorHandler);
  return app;
}
```

## backend/src/server.ts

```typescript
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 4000);
const frontendOrigin = process.env.FRONTEND_URL;
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}
if (!frontendOrigin || new URL(frontendOrigin).origin !== frontendOrigin) {
  throw new Error("FRONTEND_URL must be an origin such as http://localhost:3000");
}

const server = createApp(frontendOrigin).listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});
server.on("error", (error) => {
  console.error("API could not start:", error.message);
  process.exit(1);
});
function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
```

## backend/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

## frontend/.env.example

```text
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## frontend/next-env.d.ts

```typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />
import "./.next/types/routes.d.ts";
import "./.next/types/root-params.d.ts";

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
```

## frontend/package.json

```json
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start --port 3000",
    "typecheck": "next typegen && tsc --noEmit"
  },
  "dependencies": {
    "next": "16.3.6",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "4.3.3",
    "@types/node": "24.19.0",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "tailwindcss": "4.3.3",
    "typescript": "5.9.3"
  }
}
```

## frontend/postcss.config.mjs

```javascript
export default { plugins: { "@tailwindcss/postcss": {} } };
```

## frontend/src/app/globals.css

```css
@import "tailwindcss";

:root { color-scheme: light; }
body { margin: 0; background: #f4f7fb; color: #172033; font-family: Arial, Helvetica, sans-serif; }
button { cursor: pointer; }
button:disabled { cursor: wait; }
```

## frontend/src/app/layout.tsx

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Resume Analyzer | Phase 1",
  description: "Development setup for the AI Resume Analyzer & Job Match Platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
```

## frontend/src/app/page.tsx

```tsx
"use client";

import { useState } from "react";

type Connection = "idle" | "checking" | "connected" | "failed";

export default function Home() {
  const [connection, setConnection] = useState<Connection>("idle");
  const messages: Record<Connection, string> = {
    idle: "Ready to check your backend connection.",
    checking: "Checking the API…",
    connected: "Backend connected. Your development setup is ready.",
    failed: "Could not connect. Start the backend on port 4000 and check your environment files.",
  };

  async function checkConnection() {
    setConnection("checking");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("Missing API URL");
      const response = await fetch(`${apiUrl.replace(/\/$/, "")}/api/health`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Health check failed");
      const result = await response.json();
      if (result.success !== true || result.data?.status !== "ok") {
        throw new Error("Unexpected health response");
      }
      setConnection("connected");
    } catch {
      setConnection("failed");
    } finally {
      clearTimeout(timeout);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-12">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <p className="mb-5 text-sm font-bold tracking-widest text-indigo-600">PHASE 01 · DEVELOPMENT SETUP</p>
        <h1 className="text-3xl font-bold leading-tight sm:text-5xl">AI Resume Analyzer<br />& Job Match Platform</h1>
        <p className="mt-6 max-w-xl leading-7 text-slate-600">Our foundation for explainable resume analysis, job matching, and application tracking.</p>
        <div className="mt-8 flex flex-wrap gap-2 text-sm">
          {["Next.js + TypeScript", "Express API", "Three-member team"].map((label) => (
            <span key={label} className="rounded-full bg-slate-100 px-4 py-2">{label}</span>
          ))}
        </div>
        <div className="mt-10 border-t border-slate-200 pt-8">
          <button onClick={checkConnection} disabled={connection === "checking"} className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 disabled:opacity-60">
            {connection === "checking" ? "Checking…" : "Check backend connection"}
          </button>
          <p role="status" aria-live="polite" className={`mt-4 text-sm ${connection === "failed" ? "text-red-700" : connection === "connected" ? "text-emerald-700" : "text-slate-600"}`}>
            {messages[connection]}
          </p>
        </div>
      </section>
    </main>
  );
}
```

## frontend/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## package.json

```json
{
  "name": "ai-resume-analyzer",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["frontend", "backend"],
  "engines": { "node": ">=24 <25" },
  "scripts": {
    "dev:frontend": "npm run dev --workspace frontend",
    "dev:backend": "npm run dev --workspace backend",
    "typecheck": "npm run typecheck --workspaces",
    "build": "npm run build --workspaces"
  }
}
```
