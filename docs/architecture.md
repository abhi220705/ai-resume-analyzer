# Architecture

Current: browser -> Next.js UI -> Express REST health endpoint. npm workspaces share a root lockfile. Ports: UI 3000, API 4000.

Planned: PostgreSQL/Prisma, authenticated REST modules, private resume storage, a worker for expensive processing, optional Gemini adapter. Keep Next.js and Express separate. No microservices or Redis are introduced.

The current health route reports only process availability, not database readiness.
