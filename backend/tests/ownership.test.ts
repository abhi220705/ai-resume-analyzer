/// <reference types="node" />
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

async function request(
  path: string, expected: number, options: RequestInit = {}, token?: string,
) {
  const headers = new Headers(options.headers);
  if (typeof options.body === "string") headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`http://localhost:4000${path}`, {
    ...options, headers, redirect: "error", signal: AbortSignal.timeout(15000),
  });
  const body = await response.json();
  assert.equal(response.status, expected, `${options.method ?? "GET"} ${path}`);
  return { body, headers: response.headers };
}

async function candidate() {
  const email = `phase22-${randomUUID()}@example.invalid`;
  const password = randomBytes(24).toString("hex");
  await request("/api/auth/signup", 201, {
    method: "POST",
    body: JSON.stringify({ name: "Ownership Test", email, password, role: "CANDIDATE" }),
  });
  const { body } = await request("/api/auth/login", 200, {
    method: "POST", body: JSON.stringify({ email, password }),
  });
  assert.equal(typeof body.data.accessToken, "string");
  return body.data.accessToken as string;
}

test("candidates cannot access or process another candidate's resume", async () => {
  assert.ok(process.env.OWNERSHIP_TEST_PDF, "Set OWNERSHIP_TEST_PDF first.");
  const bytes = await readFile(process.env.OWNERSHIP_TEST_PDF);
  const owner = await candidate();
  const other = await candidate();
  const form = new FormData();
  form.append("resume", new Blob([new Uint8Array(bytes)], {
    type: "application/pdf",
  }), "phase22-test.pdf");
  const uploaded = await request("/api/resumes", 201, { method: "POST", body: form }, owner);
  const id = uploaded.body.data.resume.id;
  assert.equal(typeof id, "string");
  const own = await request(`/api/resumes/${id}`, 200, {}, owner);
  assert.equal(own.headers.get("cache-control"), "no-store");
  const list = await request("/api/resumes", 200, {}, other);
  assert.equal(list.body.data.resumes.some((r: { id: string }) => r.id === id), false);
  for (const suffix of ["", "/analysis", "/ocr"]) {
    await request(`/api/resumes/${id}${suffix}`, 404, {}, other);
  }
  await request(`/api/integrity/${id}`, 404, {}, other);
  for (const action of ["parse", "analysis", "ocr"]) {
    await request(`/api/resumes/${id}/${action}`, 404, { method: "POST", body: "{}" }, other);
  }
});