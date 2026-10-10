import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";
import { verifyAccessToken } from "../lib/tokens.js";

export const requireAuth: RequestHandler = async (request, response, next) => {
  response.set("Cache-Control", "no-store");

  function reject(message: string) {
    response.status(401).json({ success: false, message, errors: [] });
  }

  const authorization = request.get("Authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);

  if (!match) {
    reject("Authentication required.");
    return;
  }

  let payload: ReturnType<typeof verifyAccessToken>;
  try {
    payload = verifyAccessToken(match[1]!);
  } catch {
    reject("Invalid or expired access token.");
    return;
  }

  const session = await prisma.refreshSession.findFirst({
    where: {
      id: payload.sid,
      userId: payload.sub,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  if (!session) {
    reject("Session is no longer active. Please log in again.");
    return;
  }

  response.locals.auth = { sessionId: session.id, user: session.user };
  next();
};