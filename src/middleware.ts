import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/forgot-password", "/api/auth", "/api/signup", "/api/otp"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  if (!pathname.startsWith("/app")) return NextResponse.next();

  // Auth.js (v5) names the session cookie `authjs.session-token`
  // (or `__Secure-…` on https) and SPLITS it into `.0`, `.1`, … chunks
  // when the JWT exceeds ~4KB. Match the base name and any chunk suffix.
  const hasSession = req.cookies.getAll().some((c) => {
    const n = c.name;
    return (
      n === "authjs.session-token" ||
      n === "__Secure-authjs.session-token" ||
      n.startsWith("authjs.session-token.") ||
      n.startsWith("__Secure-authjs.session-token.")
    );
  });
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
