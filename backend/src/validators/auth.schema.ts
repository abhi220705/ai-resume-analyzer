import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email must not exceed 254 characters.")
  .pipe(z.email("Enter a valid email address."));

const signupPasswordSchema = z
  .string()
  .min(12, "Password must contain at least 12 characters.")
  .refine(
    (password) => Buffer.byteLength(password, "utf8") <= 72,
    "Password must not exceed 72 UTF-8 bytes.",
  );

export const signupSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters.")
    .max(100, "Name must not exceed 100 characters."),

  email: emailSchema,

  password: signupPasswordSchema,

  role: z.enum(["CANDIDATE", "RECRUITER"]).default("CANDIDATE"),
});

export const loginSchema = z.strictObject({
  email: emailSchema,

  password: z
    .string()
    .min(1, "Password is required.")
    .refine(
      (password) => Buffer.byteLength(password, "utf8") <= 72,
      "Password must not exceed 72 UTF-8 bytes.",
    ),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;