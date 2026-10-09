import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request, Response } from "express";

import { matchResumeToJob } from "../src/lib/job-matching.js";
import { detectResumeSkills } from "../src/lib/resume-skills.js";
import { analyzeResumeIntegrity } from "../src/lib/resume-integrity.js";
import { signupSchema } from "../src/validators/auth.schema.js";
import { jobQuerySchema } from "../src/validators/job.schema.js";
import { requireRole } from "../src/middleware/require-role.js";

test("matching: required and preferred coverage contribute 80/20", () => {
  const result = matchResumeToJob(
    "Built applications with Python and Docker.",
    ["Python", "Java"],
    ["Docker"],
  );

  assert.equal(result.score, 60);
  assert.deepEqual(result.matchedRequired, ["Python"]);
  assert.deepEqual(result.missingRequired, ["Java"]);
  assert.deepEqual(result.matchedPreferred, ["Docker"]);
});

test("matching: aliases cannot earn duplicate points", () => {
  const result = matchResumeToJob(
    "Developed APIs using NODEJS.",
    ["Node.js", "nodejs"],
    ["node js"],
  );

  assert.equal(result.score, 100);
  assert.equal(result.breakdown.required.total, 1);
  assert.equal(result.breakdown.preferred.total, 0);
  assert.equal(result.breakdown.required.weight, 100);
});

test("matching: technology names must not match inside other words", () => {
  const result = matchResumeToJob(
    "JavaScript, PostgreSQL and GitHub",
    ["Java", "SQL", "Git"],
    [],
  );

  assert.equal(result.score, 0);
  assert.deepEqual(result.matchedRequired, []);
});

test("matching: unknown skills use literal phrases", () => {
  const result = matchResumeToJob(
    "Experience with customer   support and aXb.",
    ["Customer Support", "a.b"],
    [],
  );

  assert.equal(result.score, 50);
  assert.deepEqual(result.matchedRequired, ["customer support"]);
  assert.deepEqual(result.missingRequired, ["a.b"]);
});

test("matching: missing text and oversized inputs are rejected", () => {
  assert.throws(
    () => matchResumeToJob("   ", ["Python"], []),
    /readable resume text/,
  );

  assert.throws(
    () => matchResumeToJob("x".repeat(100_001), ["Python"], []),
    /matching limit/,
  );

  assert.throws(
    () => matchResumeToJob("Python", [], []),
    /at least one required skill/,
  );

  assert.throws(
    () => matchResumeToJob("Python", Array(31).fill("Python"), []),
    /at most 30/,
  );
});

test("skills: punctuation-based names and aliases remain distinct", () => {
  const skills = detectResumeSkills(
    "C++, cpp, C#, csharp, JavaScript, ReactJS",
  );

  assert.deepEqual(
    new Set(skills),
    new Set(["C++", "C#", "JavaScript", "React"]),
  );
});

const sharedText = Array.from(
  { length: 40 },
  (_, index) => `word${index}`,
).join(" ");

const integrityInput = {
  extractedText: sharedText,
  ocrText: sharedText,
  parseStatus: "COMPLETED",
  ocrStatus: "COMPLETED",
  pageCount: 1,
  ocrPageCount: 1,
  ocrConfidence: 95,
};

test("integrity: identical readable text is consistent", () => {
  const result = analyzeResumeIntegrity(integrityInput);

  assert.equal(result.score, 100);
  assert.equal(result.status, "CONSISTENT");
  assert.deepEqual(result.nativeExtraTerms, []);
});

test("integrity: repeated extra terms produce a review signal", () => {
  const result = analyzeResumeIntegrity({
    ...integrityInput,
    extractedText: `${sharedText} ${"python ".repeat(40)}`,
  });

  assert.equal(result.score, 67);
  assert.equal(result.status, "REVIEW_RECOMMENDED");
  assert.deepEqual(result.nativeExtraTerms, [
    { term: "python", extraOccurrences: 40 },
  ]);
});

test("integrity: incomplete page coverage prevents scoring", () => {
  const result = analyzeResumeIntegrity({
    ...integrityInput,
    pageCount: 2,
    ocrPageCount: 1,
  });

  assert.equal(result.score, null);
  assert.equal(result.status, "INSUFFICIENT_EVIDENCE");
});

test("integrity: low OCR confidence requires review even at 100", () => {
  const result = analyzeResumeIntegrity({
    ...integrityInput,
    ocrConfidence: 50,
  });

  assert.equal(result.score, 100);
  assert.equal(result.status, "REVIEW_RECOMMENDED");
  assert.equal(result.comparisonConfidence, "LOW");
});

test("integrity: missing and oversized text are not scored", () => {
  for (const extractedText of [null, "x".repeat(100_001)]) {
    const result = analyzeResumeIntegrity({
      ...integrityInput,
      extractedText,
    });

    assert.equal(result.score, null);
    assert.equal(result.status, "INSUFFICIENT_EVIDENCE");
  }
});

const signupInput = {
  name: "Test Candidate",
  email: "candidate@example.com",
  password: "LocalTestOnly2026!",
};

test("signup: normalizes email and defaults to candidate", () => {
  const result = signupSchema.parse({
    ...signupInput,
    email: "  Candidate@Example.COM  ",
  });

  assert.equal(result.email, "candidate@example.com");
  assert.equal(result.role, "CANDIDATE");
});

test("signup: public registration cannot create admins", () => {
  assert.equal(
    signupSchema.safeParse({
      ...signupInput,
      role: "ADMIN",
    }).success,
    false,
  );

  assert.equal(
    signupSchema.safeParse({
      ...signupInput,
      isAdmin: true,
    }).success,
    false,
  );
});

test("signup: enforces minimum length and bcrypt UTF-8 byte limit", () => {
  assert.equal(
    signupSchema.safeParse({
      ...signupInput,
      password: "short",
    }).success,
    false,
  );

  assert.equal(
    signupSchema.safeParse({
      ...signupInput,
      password: "a".repeat(72),
    }).success,
    true,
  );

  assert.equal(
    signupSchema.safeParse({
      ...signupInput,
      password: "é".repeat(37),
    }).success,
    false,
  );
});

test("pagination: rejects invalid pages and unexpected query keys", () => {
  assert.equal(jobQuerySchema.parse({}).page, 1);

  for (const page of ["0", "-1", "1.5", "10000", "abc"]) {
    assert.equal(jobQuerySchema.safeParse({ page }).success, false);
  }

  assert.equal(
    jobQuerySchema.safeParse({ page: "1", role: "ADMIN" }).success,
    false,
  );
});

type Role = "CANDIDATE" | "RECRUITER" | "ADMIN";

// A small response double lets us test role decisions without a server.
// It does not test token verification or database-backed ownership.
function checkRole(allowed: Role[], current?: Role) {
  let statusCode = 200;
  let nextCalls = 0;
  let body: unknown;

  const responseDouble = {
    locals: current ? { auth: { user: { role: current } } } : {},
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(value: unknown) {
      body = value;
      return this;
    },
  };

  requireRole(...allowed)(
    {} as Request,
    responseDouble as unknown as Response,
    () => {
      nextCalls += 1;
    },
  );

  return { statusCode, nextCalls, body };
}

test("permissions: unauthenticated requests cannot continue", () => {
  const result = checkRole(["ADMIN"]);

  assert.equal(result.statusCode, 401);
  assert.equal(result.nextCalls, 0);
  assert.deepEqual(result.body, {
    success: false,
    message: "Authentication required.",
    errors: [],
  });
});

test("permissions: candidates and recruiters cannot use admin actions", () => {
  for (const role of ["CANDIDATE", "RECRUITER"] as const) {
    const result = checkRole(["ADMIN"], role);

    assert.equal(result.statusCode, 403);
    assert.equal(result.nextCalls, 0);
  }
});

test("permissions: admin access continues exactly once", () => {
  const result = checkRole(["ADMIN"], "ADMIN");

  assert.equal(result.nextCalls, 1);
  assert.equal(result.body, undefined);
});

test("permissions: candidate-only matching blocks other roles", () => {
  assert.equal(checkRole(["CANDIDATE"], "CANDIDATE").nextCalls, 1);

  for (const role of ["RECRUITER", "ADMIN"] as const) {
    const result = checkRole(["CANDIDATE"], role);

    assert.equal(result.statusCode, 403);
    assert.equal(result.nextCalls, 0);
  }
});