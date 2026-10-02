import { requireAuth } from "../middleware/require-auth.js";
import { randomBytes } from "node:crypto";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
} from "../lib/tokens.js";
import { authConfig } from "../config/auth.js";
import {
  signupSchema,
  loginSchema,
} from "../validators/auth.schema.js";

export const authRouter = Router();

// Used when an email does not exist, so login still checks a hash.
const dummyPasswordHash = await hashPassword(
  randomBytes(24).toString("hex"),
);

authRouter.use((request, response, next) => {
  response.set("Cache-Control", "no-store");

  const origin = request.get("Origin");

  if (origin && origin !== process.env.FRONTEND_URL) {
    response.status(403).json({
      success: false,
      message: "Request origin is not allowed.",
      errors: [],
    });
    return;
  }

  if (request.method === "POST" && !request.is("application/json")) {
    response.status(415).json({
      success: false,
      message: "Content-Type must be application/json.",
      errors: [],
    });
    return;
  }

  next();
});

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many signup attempts. Try again later.",
    errors: [],
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Try again later.",
    errors: [],
  },
});

authRouter.post("/signup", signupLimiter, async (request, response) => {
  const result = signupSchema.safeParse(request.body);

  if (!result.success) {
    response.status(400).json({
      success: false,
      message: "Please check your signup details.",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  const { name, email, password, role } = result.data;

  try {
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    response.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: { user },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      response.status(409).json({
        success: false,
        message: "An account with this email already exists.",
        errors: [],
      });
      return;
    }

    throw error;
  }
});

authRouter.post("/login", loginLimiter, async (request, response) => {
  const result = loginSchema.safeParse(request.body);

  if (!result.success) {
    response.status(400).json({
      success: false,
      message: "Please check your login details.",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  const { email, password } = result.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      passwordHash: true,
    },
  });

  const passwordMatches = await verifyPassword(
    password,
    user?.passwordHash ?? dummyPasswordHash,
  );

  if (!user || !passwordMatches) {
    response.status(401).json({
      success: false,
      message: "Invalid email or password.",
      errors: [],
    });
    return;
  }

  const refreshToken = createRefreshToken();

  const session = await prisma.refreshSession.create({
    data: {
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(
        Date.now() + authConfig.refreshTokenTtlSeconds * 1000,
      ),
    },
  });

  const accessToken = createAccessToken(user.id, session.id);

  response.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
    maxAge: authConfig.refreshTokenTtlSeconds * 1000,
  });

  response.status(200).json({
    success: true,
    message: "Logged in successfully.",
    data: {
      accessToken,
      tokenType: "Bearer",
      expiresIn: authConfig.accessTokenTtlSeconds,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
});

authRouter.get("/me", requireAuth, (_request, response) => {
  response.status(200).json({
    success: true,
    message: "Current user retrieved successfully.",
    data: {
      user: response.locals.auth.user,
    },
  });
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many refresh attempts. Try again later.",
    errors: [],
  },
});

authRouter.post("/refresh", refreshLimiter, async (request, response) => {
  const refreshToken: unknown = request.cookies?.refreshToken;

  if (
    typeof refreshToken !== "string" ||
    !/^[a-f0-9]{64}$/.test(refreshToken)
  ) {
    response.status(401).json({
      success: false,
      message: "Please log in again.",
      errors: [],
    });
    return;
  }

  const tokenHash = hashRefreshToken(refreshToken);

  const session = await prisma.refreshSession.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
    },
  });

  if (!session) {
    response.status(401).json({
      success: false,
      message: "Invalid or expired refresh token. Please log in again.",
      errors: [],
    });
    return;
  }

  const nextRefreshToken = createRefreshToken();
  const accessToken = createAccessToken(session.userId, session.id);

  // Only one request can successfully replace this token.
  const updated = await prisma.refreshSession.updateMany({
    where: {
      id: session.id,
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: {
      tokenHash: hashRefreshToken(nextRefreshToken),
    },
  });

  if (updated.count !== 1) {
    response.status(401).json({
      success: false,
      message: "Refresh token is no longer valid. Please log in again.",
      errors: [],
    });
    return;
  }

  response.cookie("refreshToken", nextRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
    expires: session.expiresAt,
  });

  response.status(200).json({
    success: true,
    message: "Access token refreshed successfully.",
    data: {
      accessToken,
      tokenType: "Bearer",
      expiresIn: authConfig.accessTokenTtlSeconds,
    },
  });
});

authRouter.post("/logout", async (request, response) => {
  const refreshToken: unknown = request.cookies?.refreshToken;

  if (
    typeof refreshToken === "string" &&
    /^[a-f0-9]{64}$/.test(refreshToken)
  ) {
    await prisma.refreshSession.updateMany({
      where: {
        tokenHash: hashRefreshToken(refreshToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  response.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
  });

  response.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
});