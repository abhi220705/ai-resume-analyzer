import { createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import type { Request, RequestHandler, Response } from "express";
import { ipKeyGenerator } from "express-rate-limit";

export const verifyProxyIdentity: RequestHandler = (
  request,
  response,
  next,
) => {
  const ip = request.get("x-resume-client-ip");
  const timestamp = request.get("x-resume-proxy-time");
  const signature = request.get("x-resume-proxy-signature");

  // Direct requests use a separate, conservative rate-limit bucket.
  if (!ip && !timestamp && !signature) {
    next();
    return;
  }

  const reject = () => {
    response.status(403).json({
      success: false,
      message: "Unable to verify request source.",
      errors: [],
    });
  };

  const secret = process.env.PROXY_SIGNING_SECRET;

  if (
    !secret ||
    secret.length < 32 ||
    !ip ||
    !isIP(ip) ||
    !timestamp ||
    !/^\d{13}$/.test(timestamp) ||
    !signature ||
    !/^[a-f0-9]{64}$/.test(signature)
  ) {
    reject();
    return;
  }

  const age = Date.now() - Number(timestamp);

  // Allow cold-start delays, with a small clock-skew allowance.
  if (age > 300_000 || age < -30_000) {
    reject();
    return;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}\n${ip}`)
    .digest();

  if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) {
    reject();
    return;
  }

  response.locals.verifiedClientIp = ip;
  next();
};

export function authRateLimitKey(
  request: Request,
  response: Response,
): string {
  const verifiedIp: unknown = response.locals.verifiedClientIp;

  if (typeof verifiedIp === "string") {
    return `verified:${ipKeyGenerator(verifiedIp)}`;
  }

  // Never trust unsigned forwarding headers.
  const directIp = request.socket.remoteAddress;

  return directIp
    ? `direct:${ipKeyGenerator(directIp)}`
    : "direct:unknown";
}