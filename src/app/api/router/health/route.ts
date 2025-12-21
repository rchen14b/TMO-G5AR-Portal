import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const DEFAULT_ROUTER_IP = "192.168.12.1"

export async function GET() {
  const cookieStore = cookies()
  const routerIp = cookieStore.get("router_ip")?.value || DEFAULT_ROUTER_IP

  try {
    // Try to fetch a lightweight endpoint to check connectivity
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

    const response = await fetch(`http://${routerIp}/TMI/v1/version`, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      return NextResponse.json({ status: "online", ip: routerIp })
    } else {
      return NextResponse.json({ status: "error", ip: routerIp, message: "Gateway returned error" })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const isTimeout = errorMessage.includes("abort") || errorMessage.includes("timeout")

    return NextResponse.json({
      status: "offline",
      ip: routerIp,
      message: isTimeout ? "Connection timeout" : errorMessage,
    })
  }
}
