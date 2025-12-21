import { NextResponse } from "next/server"
import { getTelemetryAll } from "@/lib/router-api"

export async function GET() {
  try {
    const data = await getTelemetryAll()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Telemetry API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch telemetry data" },
      { status: 500 }
    )
  }
}
