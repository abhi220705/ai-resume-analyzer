const accessTokenSecret = process.env.JWT_ACCESS_SECRET;

if (
  !accessTokenSecret ||
  !/^[a-f0-9]{64}$/i.test(accessTokenSecret)
) {
  throw new Error(
    "JWT_ACCESS_SECRET must be a 64-character hexadecimal value generated using crypto.randomBytes(32).",
  );
}

export const authConfig = {
  accessTokenSecret,
  accessTokenTtlSeconds: 15 * 60,
  refreshTokenTtlSeconds: 7 * 24 * 60 * 60,
  bcryptRounds: 12,
} as const;