import assert from "node:assert/strict";
import { test } from "node:test";

const baseUrl = (
  process.env.TEST_API_URL ?? "http://localhost:4000"
).replace(/\/$/, "");

async function request(
  path: string,
  options: RequestInit = {},
) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
}

test("API: backend is running", async () => {
  const response = await request("/api/health");
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.status, "ok");
});

test("API: database is ready", async () => {
  const response = await request("/api/health/ready");
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.database, "connected");
});

test("API: unknown routes return JSON 404", async () => {
  const response = await request("/api/phase21-missing-route");
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
});

const protectedRoutes = [
  ["GET", "/api/auth/me"],
  ["GET", "/api/resumes"],
  ["POST", "/api/matches"],
  ["GET", "/api/applications/mine"],
  ["GET", "/api/applications/received"],
  ["GET", "/api/admin/stats"],
  ["GET", "/api/admin/users"],
] as const;

for (const [method, path] of protectedRoutes) {
  test(`API: ${method} ${path} rejects missing authentication`, async () => {
    const response = await request(path, { method });
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.success, false);
  });

  test(`API: ${method} ${path} rejects invalid tokens`, async () => {
    const response = await request(path, {
      method,
      headers: {
        Authorization: "Bearer invalid-phase21-token",
      },
    });
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.success, false);
  });
}

test("API: login rejects invalid input", async () => {
  const response = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "not-an-email",
      password: "",
    }),
  });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).success, false);
});

test("API: public signup rejects the ADMIN role", async () => {
  const response = await request("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Phase 21 Test",
      email: "phase21-admin@example.invalid",
      password: "Phase21TestOnly2026!",
      role: "ADMIN",
    }),
  });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).success, false);
});

test("API: authentication rejects non-JSON requests", async () => {
  const response = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "invalid input",
  });

  assert.equal(response.status, 415);
  await response.text();
});

test("API: malformed JSON returns 400", async () => {
  const response = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: '{"email":',
  });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).success, false);
});

test("API: oversized authentication bodies return 413", async () => {
  const response = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      padding: "x".repeat(20_000),
    }),
  });

  assert.equal(response.status, 413);
  await response.text();
});

test("API: refresh without a cookie returns an empty session", async () => {
  const response = await request("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });

  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.success, true);
  assert.equal(result.data.accessToken, null);
});