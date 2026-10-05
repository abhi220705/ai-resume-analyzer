import { createHash } from "node:crypto";
import { detectResumeSkills } from "./resume-skills.js";

export const ANALYSIS_ENGINE_VERSION = "rules-v1";

type ScoreCheck = {
  id: string;
  label: string;
  earned: number;
  possible: number;
  explanation: string;
};

const sectionDefinitions = [
  {
    id: "education",
    pattern: /^(education|academic qualifications|academic background)$/i,
  },
  {
    id: "skills",
    pattern: /^(skills|technical skills|technologies|core competencies)$/i,
  },
  {
    id: "projects",
    pattern: /^(projects|personal projects|academic projects|selected projects)$/i,
  },
  {
    id: "experience",
    pattern:
      /^(experience|work experience|professional experience|internships|internship experience|employment history)$/i,
  },
  {
    id: "summary",
    pattern: /^(summary|professional summary|profile|objective|career objective)$/i,
  },
  {
    id: "certifications",
    pattern: /^(certifications|certificates|courses)$/i,
  },
  {
    id: "other",
    pattern:
      /^(achievements|awards|interests|hobbies|languages|references|publications|volunteering|extracurricular activities)$/i,
  },
] as const;

function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

export function hashResumeText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function findSections(lines: string[]) {
  const sections: Record<string, string[]> = {};
  let currentSection: string | null = null;

  for (const line of lines) {
    const heading = line
      .replace(/^[•*\-\s]+/, "")
      .replace(/[:\s]+$/, "")
      .trim();

    const definition = sectionDefinitions.find((section) =>
      section.pattern.test(heading),
    );

    if (definition) {
      currentSection = definition.id;
      sections[currentSection] ??= [];
      continue;
    }

    if (currentSection) {
      sections[currentSection]?.push(line);
    }
  }

  return sections;
}

export function analyzeResumeText(sourceText: string) {
  if (!sourceText.trim()) {
    throw new Error("Extract resume text before running analysis.");
  }

  if (sourceText.length > 100_000) {
    throw new Error("Resume text exceeds the analysis limit.");
  }

  const text = sourceText
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n");

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const wordCount = countWords(text);
  const detectedSkills = detectResumeSkills(text);
  const sections = findSections(lines);

  function sectionHasContent(id: string): boolean {
    return countWords((sections[id] ?? []).join(" ")) >= 5;
  }

  const sectionResults = sectionDefinitions
    .filter((section) => section.id !== "other")
    .map((section) => ({
      id: section.id,
      headingDetected: Object.hasOwn(sections, section.id),
      hasContent: sectionHasContent(section.id),
    }));

  const hasEmail =
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text);

  const hasProfessionalLink =
    /(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in\/|github\.com\/)[a-z0-9_-]+/i.test(
      text,
    );

  const hasEducation = sectionHasContent("education");
  const hasSkills =
    sectionHasContent("skills") && detectedSkills.length > 0;

  const hasPracticalWork =
    sectionHasContent("projects") || sectionHasContent("experience");

  const practicalLines = [
    ...(sections.projects ?? []),
    ...(sections.experience ?? []),
  ];

  const actionPattern =
    /\b(built|developed|designed|implemented|created|improved|reduced|increased|automated|tested|deployed|optimized|led|delivered|integrated|analyzed|managed)\b/i;

  const measurementPattern =
    /\b\d+(?:[.,]\d+)?\s*(?:%|percent\b|users\b|requests\b|seconds\b|milliseconds\b|hours\b|records\b|customers\b|tests\b|endpoints\b|pages\b|team members\b)/i;

  const hasActionDescription = practicalLines.some(
    (line) => countWords(line) >= 8 && actionPattern.test(line),
  );

  const hasMeasuredResult = practicalLines.some(
    (line) =>
      countWords(line) >= 8 &&
      actionPattern.test(line) &&
      measurementPattern.test(line),
  );

  const checks: ScoreCheck[] = [];
  const suggestions: string[] = [];

  function addCheck(
    id: string,
    label: string,
    passed: boolean,
    points: number,
    successMessage: string,
    suggestion: string,
  ) {
    checks.push({
      id,
      label,
      earned: passed ? points : 0,
      possible: points,
      explanation: passed ? successMessage : suggestion,
    });

    if (!passed) suggestions.push(suggestion);
  }

  addCheck(
    "email",
    "Email contact",
    hasEmail,
    10,
    "An email-shaped contact was detected.",
    "Include a readable contact email.",
  );

  addCheck(
    "professional-link",
    "Professional link",
    hasProfessionalLink,
    5,
    "A GitHub or LinkedIn profile link was detected.",
    "Consider adding a relevant GitHub or LinkedIn profile link.",
  );

  addCheck(
    "education",
    "Education details",
    hasEducation,
    15,
    "An education heading with supporting text was detected.",
    "Add a clear Education heading with your qualification and institution.",
  );

  addCheck(
    "skills",
    "Technical skills",
    hasSkills,
    15,
    "A skills section with text and a recognized technical skill were detected.",
    "Use a Technical Skills heading and list technologies you actually know.",
  );

  addCheck(
    "practical-work",
    "Projects or experience",
    hasPracticalWork,
    25,
    "A projects or experience section with supporting text was detected.",
    "Add a Projects or Experience section explaining your practical work.",
  );

  addCheck(
    "action-description",
    "Description of contributions",
    hasActionDescription,
    10,
    "A project or experience line describes an action in at least eight words.",
    "Describe what you built, tested, improved, or delivered in your projects or experience.",
  );

  addCheck(
    "measured-result",
    "Measured results",
    hasMeasuredResult,
    10,
    "An action description contains a number with a recognized measurement.",
    "Where accurate, describe a measurable result, such as users served or time saved. Do not invent numbers.",
  );

  addCheck(
    "length",
    "Text length",
    wordCount >= 200 && wordCount <= 1_000,
    10,
    "Extracted text is within this rubric's 200–1,000 word range.",
    wordCount < 200
      ? "The extracted text is short. Check extraction quality and add relevant detail where useful."
      : "The extracted text exceeds 1,000 words. Review repetition and prioritize relevant details.",
  );

  const overallScore = checks.reduce(
    (total, check) => total + check.earned,
    0,
  );

  return {
    engineVersion: ANALYSIS_ENGINE_VERSION,
    sourceTextHash: hashResumeText(sourceText),
    overallScore,
    wordCount,
    detectedSkills,
    report: {
      title: "Resume completeness and evidence checks",
      checks,
      sections: sectionResults,
      suggestions,
      limitations: [
        "This is a rule-based software/IT resume rubric, not a hiring prediction or universal ATS score.",
        "Detected skills and measurements are text mentions, not verified abilities or achievements.",
        "PDF extraction can change reading order and line breaks, causing missed sections or descriptions.",
        "Embedded hidden text can influence these checks. This analysis does not verify visual PDF content.",
      ],
    },
  };
}