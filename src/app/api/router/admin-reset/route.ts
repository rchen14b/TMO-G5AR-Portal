import { NextRequest, NextResponse } from "next/server"
import { resetAdminCredentials } from "@/lib/router-api"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    await resetAdminCredentials(body)
    const response = NextResponse.json({ success: true })
    response.cookies.delete("auth_token")
    return response
  } catch (error) {
    console.error("Admin reset API error:", error)
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    return NextResponse.json(
      { error: "Failed to reset admin credentials" },
      { status: 500 }
    )
  }
}
