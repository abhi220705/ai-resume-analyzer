import { z } from "zod";

const skillsSchema = z
  .array(z.string().trim().min(1).max(60))
  .max(30)
  .transform((skills) => {
    const seen = new Set<string>();

    return skills.filter((skill) => {
      const key = skill.toLowerCase();

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
  });

export const jobSchema = z
  .strictObject({
    title: z.string().trim().min(3).max(150),
    description: z.string().trim().min(50).max(5000),
    location: z.string().trim().min(2).max(150),
    employmentType: z.enum([
      "FULL_TIME",
      "PART_TIME",
      "INTERNSHIP",
      "CONTRACT",
    ]),
    workMode: z.enum(["ON_SITE", "HYBRID", "REMOTE"]),
    minExperienceYears: z.number().int().min(0).max(50),
    requiredSkills: skillsSchema.refine(
      (skills) => skills.length > 0,
      "Add at least one required skill.",
    ),
    preferredSkills: skillsSchema,
  })
  .refine(
    (job) => {
      const required = new Set(
        job.requiredSkills.map((skill) => skill.toLowerCase()),
      );

      return job.preferredSkills.every(
        (skill) => !required.has(skill.toLowerCase()),
      );
    },
    {
      message: "A skill cannot be both required and preferred.",
      path: ["preferredSkills"],
    },
  );

export const jobQuerySchema = z.strictObject({
  page: z
    .string()
    .regex(/^[1-9]\d{0,3}$/)
    .transform(Number)
    .default(1),
  q: z.string().trim().max(100).optional(),
});