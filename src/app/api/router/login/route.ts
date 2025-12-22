import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const DEFAULT_ROUTER_IP = "192.168.12.1"

export async function POST(request: Request) {
  try {
    const { username, password, routerIp } = await request.json()
    const ip = routerIp || DEFAULT_ROUTER_IP

    const response = await fetch(`http://${ip}/TMI/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })

    const data = await response.json()

    if (data.auth?.token) {
      const tokenMaxAge = data.auth.expiration - Math.floor(Date.now() / 1000)

      // Set auth cookie (secure only if actually using HTTPS)
      cookies().set("auth_token", data.auth.token, {
        httpOnly: true,
        secure: false, // Allow HTTP for local network access
        sameSite: "lax",
        maxAge: tokenMaxAge,
        path: "/",
      })

      // Store router IP in cookie for other API routes
      cookies().set("router_ip", ip, {
        httpOnly: true,
        secure: false, // Allow HTTP for local network access
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      })

      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { success: false, error: data.result?.message || "Invalid credentials" },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { success: false, error: "Connection failed" },
      { status: 500 }
    )
  }
}
