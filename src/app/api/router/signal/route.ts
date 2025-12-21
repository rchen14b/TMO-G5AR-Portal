import { NextResponse } from "next/server"
import { getSignalInfo } from "@/lib/router-api"

export async function GET() {
  try {
    const data = await getSignalInfo()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Signal API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch signal info" },
      { status: 500 }
    )
  }
}
