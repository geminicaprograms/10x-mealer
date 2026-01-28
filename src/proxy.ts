import { type NextRequest } from "next/server";
import { updateSession } from "@/db/supabase/middleware";

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = ["/login", "/register", "/reset-password"];

/**
 * Routes that require completed onboarding
 * AI features are blocked for users with pending onboarding
 */
const PROTECTED_AI_ROUTES = ["/api/ai/"];

/**
 * Check if the path matches any of the routes
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some((route) => pathname.startsWith(route));
}

export async function proxy(request: NextRequest) {
  // Update session (refresh if expired)
  const response = await updateSession(request);

  const { pathname } = request.nextUrl;

  // Allow public routes without any checks
  if (matchesRoute(pathname, PUBLIC_ROUTES)) {
    return response;
  }

  // Allow API routes to handle their own auth (they return 401 if unauthorized)
  if (pathname.startsWith("/api/")) {
    return response;
  }

  // Allow static files and Next.js internals
  if (pathname.startsWith("/_next/") || pathname.startsWith("/favicon.ico") || pathname.includes(".")) {
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
