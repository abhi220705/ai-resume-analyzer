import type { RequestHandler } from "express";
import type { UserRole } from "../generated/prisma/client.js";

export function requireRole(
  ...allowedRoles: UserRole[]
): RequestHandler {
  return (_request, response, next) => {
    const auth = response.locals.auth;

    if (!auth?.user) {
      response.status(401).json({
        success: false,
        message: "Authentication required.",
        errors: [],
      });
      return;
    }

    if (!allowedRoles.includes(auth.user.role)) {
      response.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
        errors: [],
      });
      return;
    }

    next();
  };
}