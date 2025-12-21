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

  // Check if it's a protected API route
  if (protectedApiRoutes.some((route) => pathname.startsWith(route))) {
    if (!authToken) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }
  }

  // Check if it's a protected page
  if (protectedPages.includes(pathname)) {
    if (!authToken) {
      const loginUrl = new URL("/login", request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Redirect logged-in users away from login page
  if (pathname === "/login" && authToken) {
    const homeUrl = new URL("/", request.url)
    return NextResponse.redirect(homeUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
