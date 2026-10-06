import { skillDictionary } from "./resume-skills.js";

export const MATCH_ENGINE_VERSION = "skills-v1";

function normalize(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const aliasLookup = new Map<
  string,
  { name: string; aliases: readonly string[] }
>();

for (const skill of skillDictionary) {
  aliasLookup.set(normalize(skill.name), skill);

  for (const alias of skill.aliases) {
    aliasLookup.set(normalize(alias), skill);
  }
}

function canonicalName(value: string): string {
  const normalized = normalize(value);
  return aliasLookup.get(normalized)?.name ?? normalized;
}

function uniqueSkills(values: string[]): string[] {
  const result = new Map<string, string>();

  for (const value of values) {
    const name = canonicalName(value);
    const key = normalize(name);

    if (key && !result.has(key)) {
      result.set(key, name);
    }
  }

  return [...result.values()];
}

function containsSkill(normalizedText: string, skillName: string): boolean {
  const definition = aliasLookup.get(normalize(skillName));

  // Skills outside the dictionary use literal phrase matching.
  const aliases = definition
    ? [definition.name, ...definition.aliases]
    : [skillName];

  return aliases.some((alias) => {
    const escaped = escapeRegExp(normalize(alias)).replace(/\s+/g, "\\s+");

    const pattern = new RegExp(
      `(?:^|[^\\p{L}\\p{N}_+#])${escaped}(?=$|[^\\p{L}\\p{N}_+#])`,
      "iu",
    );

    return pattern.test(normalizedText);
  });
}

function validateSkills(skills: string[]) {
  if (
    skills.length > 30 ||
    skills.some((skill) => !skill.trim() || skill.length > 60)
  ) {
    throw new Error("Job skill lists must contain at most 30 non-empty skills.");
  }
}

export function matchResumeToJob(
  resumeText: string,
  requiredSkills: string[],
  preferredSkills: string[],
) {
  if (!resumeText.trim()) {
    throw new Error("Extract readable resume text before matching.");
  }

  if (resumeText.length > 100_000) {
    throw new Error("Resume text exceeds the matching limit.");
  }

  validateSkills(requiredSkills);
  validateSkills(preferredSkills);

  const text = normalize(resumeText);
  const required = uniqueSkills(requiredSkills);
  const requiredKeys = new Set(required.map(normalize));

  // Count aliases once and prevent a required skill earning preferred points.
  const preferred = uniqueSkills(preferredSkills).filter(
    (skill) => !requiredKeys.has(normalize(skill)),
  );

  if (required.length === 0) {
    throw new Error("The job must contain at least one required skill.");
  }

  const matchedRequired = required.filter((skill) =>
    containsSkill(text, skill),
  );

  const missingRequired = required.filter(
    (skill) => !containsSkill(text, skill),
  );

  const matchedPreferred = preferred.filter((skill) =>
    containsSkill(text, skill),
  );

  const missingPreferred = preferred.filter(
    (skill) => !containsSkill(text, skill),
  );

  const requiredWeight = preferred.length > 0 ? 80 : 100;
  const preferredWeight = preferred.length > 0 ? 20 : 0;

  const requiredPoints =
    (matchedRequired.length / required.length) * requiredWeight;

  const preferredPoints =
    preferred.length > 0
      ? (matchedPreferred.length / preferred.length) * preferredWeight
      : 0;

  const score = Math.round(requiredPoints + preferredPoints);

  return {
    engineVersion: MATCH_ENGINE_VERSION,
    score,
    matchedRequired,
    missingRequired,
    matchedPreferred,
    missingPreferred,
    breakdown: {
      required: {
        matched: matchedRequired.length,
        total: required.length,
        weight: requiredWeight,
        points: Number(requiredPoints.toFixed(2)),
      },
      preferred: {
        matched: matchedPreferred.length,
        total: preferred.length,
        weight: preferredWeight,
        points: Number(preferredPoints.toFixed(2)),
      },
    },
    explanation:
      preferred.length > 0
        ? "Required skill coverage contributes 80 points; preferred skill coverage contributes 20. The total is rounded."
        : "Required skill coverage contributes all 100 points because no separate preferred skills are listed.",
    limitations: [
      "This score measures skill mentions in extracted resume text, not proficiency or hiring probability.",
      "Experience, education, location, and work eligibility are not included in this skill score.",
      "Known aliases are recognized. Other skills use literal phrase matching.",
      "Negated claims and hidden PDF text can still produce matches.",
    ],
  };
}