import { NextResponse } from "next/server"
import { getSimInfo } from "@/lib/router-api"

export async function GET() {
  try {
    const data = await getSimInfo()
    return NextResponse.json(data)
  } catch (error) {
    console.error("SIM API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch SIM info" },
      { status: 500 }
    )
  }
}
