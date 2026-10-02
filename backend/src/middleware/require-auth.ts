import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";
import { verifyAccessToken } from "../lib/tokens.js";

export const requireAuth: RequestHandler = async (
  request,
  response,
  next,
) => {
  const authorization = request.get("Authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);

  if (!match) {
    response.status(401).json({
      success: false,
      message: "Authentication required.",
      errors: [],
    });
    return;
  }

  let payload: ReturnType<typeof verifyAccessToken>;

  try {
    payload = verifyAccessToken(match[1]!);
  } catch {
    response.status(401).json({
      success: false,
      message: "Invalid or expired access token.",
      errors: [],
    });
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
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!session) {
    response.status(401).json({
      success: false,
      message: "Session is no longer active. Please log in again.",
      errors: [],
    });
    return;
  }

  response.locals.auth = {
    sessionId: session.id,
    user: session.user,
  };

  next();
};