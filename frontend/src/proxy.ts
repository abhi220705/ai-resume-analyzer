import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  // Local development continues using the existing configuration.
  if (process.env.VERCEL !== "1") {
    return NextResponse.next();
  }

  const secret = process.env.PROXY_SIGNING_SECRET;
  const backendUrl = process.env.BACKEND_URL;
  const ip = request.headers.get("x-forwarded-for")?.trim();

  if (!secret || secret.length < 32 || !backendUrl || !ip || !isIP(ip)) {
    return NextResponse.json(
      {
        success: false,
        message: "Authentication service is temporarily unavailable.",
        errors: [],
      },
      { status: 503 },
    );
  }

  const timestamp = String(Date.now());
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}\n${ip}`)
    .digest("hex");

  // Replace any client-supplied values with our signed identity.
  const headers = new Headers(request.headers);
  headers.set("x-resume-client-ip", ip);
  headers.set("x-resume-proxy-time", timestamp);
  headers.set("x-resume-proxy-signature", signature);

  const destination = new URL(backendUrl);
  destination.pathname = request.nextUrl.pathname;
  destination.search = request.nextUrl.search;

  return NextResponse.rewrite(destination, {
    request: { headers },
  });
}

export const config = {
  matcher: "/api/auth/:path*",
};