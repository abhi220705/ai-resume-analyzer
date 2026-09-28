# API documentation

Base URL in development: http://localhost:4000

## GET /api/health

Public. HTTP 200. Response: success=true, message="Backend is running", data={status:"ok",service:"resume-analyzer-api"}.

No authentication, persistence, PDF analysis, or database check exists yet.

Unknown routes return HTTP 404 with success=false, message="Route not found", errors=[].
