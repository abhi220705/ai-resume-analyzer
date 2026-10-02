import bcrypt from "bcrypt";
import { authConfig } from "../config/auth.js";

export async function hashPassword(password: string): Promise<string> {
  if (Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("Password must not exceed 72 UTF-8 bytes.");
  }

  return bcrypt.hash(password, authConfig.bcryptRounds);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (Buffer.byteLength(password, "utf8") > 72) {
    return false;
  }

  return bcrypt.compare(password, passwordHash);
}