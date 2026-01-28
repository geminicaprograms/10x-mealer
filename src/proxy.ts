import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/db/supabase/middleware";

/**
 * Public routes that don't require authentication.
 * Unauthenticated users can access these routes.
 */
const PUBLIC_ROUTES = ["/login", "/register", "/reset-password"];

/**
 * Protected routes that require authentication.
 * Unauthenticated users will be redirected to login.
 */
const PROTECTED_ROUTES = ["/onboarding", "/inventory", "/recipes", "/shopping-list", "/settings"];

/**
 * Check if the path matches any of the routes
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some((route) => pathname.startsWith(route));
}

/**
 * Create a redirect response to the login page
 */
function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  // Preserve the original URL as a redirect parameter
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  // Update session (refresh if expired) and get user
  const { response, user } = await updateSession(request);

  const { pathname } = request.nextUrl;

  // Allow static files and Next.js internals
  if (pathname.startsWith("/_next/") || pathname.startsWith("/favicon.ico") || pathname.includes(".")) {
    return response;
  }

  // Allow public routes without any checks
  if (matchesRoute(pathname, PUBLIC_ROUTES)) {
    // If user is already authenticated, redirect away from auth pages to home
    if (user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  // Allow API routes to handle their own auth (they return 401 if unauthorized)
  if (pathname.startsWith("/api/")) {
    return response;
  }

  // Protect routes that require authentication
  if (matchesRoute(pathname, PROTECTED_ROUTES)) {
    if (!user) {
      return redirectToLogin(request);
    }
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
