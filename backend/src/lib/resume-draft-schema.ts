import { z } from "zod";

const text = (max: number) => z.string().max(max);

const month = z
  .string()
  .regex(
    /^$|^\d{4}-(0[1-9]|1[0-2])$/,
    "Use a valid year and month.",
  );

const entryId = z.string().uuid();

const bullets = z
  .array(text(2500))
  .max(100)
  .refine(
    (items) => items.join("\n").length <= 2500,
    "Keep the combined bullet points within 2500 characters.",
  );

const education = z
  .strictObject({
    id: entryId,
    institution: text(200),
    qualification: text(150),
    fieldOfStudy: text(150),
    startDate: month,
    endDate: month,
    currentlyStudying: z.boolean(),
    grade: text(80),
    details: text(800),
  })
  .refine(
    (entry) =>
      !entry.startDate ||
      !entry.endDate ||
      entry.endDate >= entry.startDate,
    {
      message: "End date must not be before start date.",
      path: ["endDate"],
    },
  );

const experience = z
  .strictObject({
    id: entryId,
    company: text(200),
    role: text(150),
    location: text(150),
    startDate: month,
    endDate: month,
    currentlyWorking: z.boolean(),
    bullets,
  })
  .refine(
    (entry) =>
      entry.currentlyWorking ||
      !entry.startDate ||
      !entry.endDate ||
      entry.endDate >= entry.startDate,
    {
      message: "End date must not be before start date.",
      path: ["endDate"],
    },
  );

const project = z.strictObject({
  id: entryId,
  name: text(150),
  role: text(150),
  technologies: z
    .array(text(500))
    .max(100)
    .refine(
      (items) => items.join(",").length <= 500,
      "Keep technologies within 500 characters.",
    ),
  link: text(500),
  bullets,
});

const skillGroup = z.strictObject({
  id: entryId,
  category: text(80),
  skills: z
    .array(text(600))
    .max(100)
    .refine(
      (items) => items.join(",").length <= 600,
      "Keep this skill group within 600 characters.",
    ),
});

const achievement = z.strictObject({
  id: entryId,
  title: text(200),
  organization: text(200),
  date: month,
  details: text(800),
});

export const resumeDraftDataSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    title: z.string().trim().min(1).max(100),
    template: z.literal("classic"),

    personal: z.strictObject({
      fullName: text(100),
      headline: text(150),
      email: text(254),
      phone: text(30),
      location: text(150),
      linkedin: text(500),
      github: text(500),
      portfolio: text(500),
      summary: text(1500),
    }),

    // Photo storage will be connected in the next backend step.
    photo: z.strictObject({
      storageKey: z.null(),
      showOnResume: z.boolean(),
    }),

    education: z.array(education).max(10),
    experience: z.array(experience).max(10),
    projects: z.array(project).max(10),
    skillGroups: z.array(skillGroup).max(10),
    achievements: z.array(achievement).max(10),
  })
  .superRefine((data, context) => {
    const collections = [
      "education",
      "experience",
      "projects",
      "skillGroups",
      "achievements",
    ] as const;

    for (const name of collections) {
      const ids = data[name].map((entry) => entry.id);

      if (new Set(ids).size !== ids.length) {
        context.addIssue({
          code: "custom",
          path: [name],
          message: "Entries must have unique IDs.",
        });
      }
    }
  });

export const createResumeDraftSchema = z.strictObject({
  data: resumeDraftDataSchema,
  photoDataUrl: z.string().max(700000).nullable().optional(),
});

export const updateResumeDraftSchema = z.strictObject({
  revision: z.number().int().min(1).max(2147483646),
  data: resumeDraftDataSchema,
  photoDataUrl: z.string().max(700000).nullable().optional(),
});

export const resumeDraftIdSchema = z.string().uuid();
