import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  // Clear auth cookies
  cookies().delete("auth_token")
  cookies().delete("router_ip")

  return NextResponse.json({ success: true })
}
