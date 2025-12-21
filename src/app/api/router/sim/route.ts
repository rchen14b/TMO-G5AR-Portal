import { NextResponse } from "next/server"
import { getSimInfo } from "@/lib/router-api"

export async function GET() {
  try {
    const data = await getSimInfo()
    return NextResponse.json(data)
  } catch (error) {
    console.error("SIM API error:", error)
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    return NextResponse.json(
      { error: "Failed to fetch SIM info" },
      { status: 500 }
    )
  }
}
