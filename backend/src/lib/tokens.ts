import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { authConfig } from "../config/auth.js";

const issuer = "resume-analyzer-api";
const audience = "resume-analyzer-client";

const signingKey = Buffer.from(
  authConfig.accessTokenSecret,
  "hex",
);

const accessTokenPayloadSchema = z.object({
  sub: z.uuid(),
  sid: z.uuid(),
  type: z.literal("access"),
  exp: z.number().int(),
});

export function createAccessToken(
  userId: string,
  sessionId: string,
): string {
  return jwt.sign(
    {
      sid: sessionId,
      type: "access",
    },
    signingKey,
    {
      algorithm: "HS256",
      subject: userId,
      issuer,
      audience,
      expiresIn: authConfig.accessTokenTtlSeconds,
    },
  );
}

export function verifyAccessToken(token: string) {
  const decoded = jwt.verify(token, signingKey, {
    algorithms: ["HS256"],
    issuer,
    audience,
  });

  return accessTokenPayloadSchema.parse(decoded);
}

export function createRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}