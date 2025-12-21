import { NextResponse } from "next/server"
import { getTelemetryAll } from "@/lib/router-api"

export async function GET() {
  try {
    const data = await getTelemetryAll()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Telemetry API error:", error)
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    return NextResponse.json(
      { error: "Failed to fetch telemetry data" },
      { status: 500 }
    )
  }
}
