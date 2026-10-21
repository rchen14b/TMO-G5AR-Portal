import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  const cookieStore = await cookies()

  // Clear auth cookies by setting them to expire immediately
  cookieStore.set("auth_token", "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })

  cookieStore.set("router_ip", "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })

  return NextResponse.json({ success: true })
}
