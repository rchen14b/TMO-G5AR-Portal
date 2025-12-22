import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes that require authentication
const protectedApiRoutes = [
  "/api/router/clients",
  "/api/router/cell",
  "/api/router/sim",
  "/api/router/ap",
  "/api/router/telemetry",
  "/api/router/reboot",
]

// Dashboard pages that require authentication
const protectedPages = [
  "/",
  "/devices",
  "/wifi",
  "/cell",
  "/system",
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authToken = request.cookies.get("auth_token")?.value

  // Check if user is authenticated (token exists and is not empty)
  const isAuthenticated = authToken && authToken.length > 0

  // Check if it's a protected API route
  if (protectedApiRoutes.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }
  }

  // Check if it's a protected page
  if (protectedPages.includes(pathname)) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Redirect logged-in users away from login page
  if (pathname === "/login" && isAuthenticated) {
    const homeUrl = new URL("/", request.url)
    return NextResponse.redirect(homeUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match only specific paths that need middleware:
     * - / (home)
     * - /login
     * - /devices, /wifi, /cell, /system (dashboard pages)
     * - /api/router/* (API routes)
     */
    "/",
    "/login",
    "/devices",
    "/wifi",
    "/cell",
    "/system",
    "/api/router/:path*",
  ],
}
