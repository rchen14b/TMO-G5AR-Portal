import { NextResponse } from "next/server"
import { getGatewayInfo } from "@/lib/router-api"

export async function GET() {
  try {
    const data = await getGatewayInfo()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Gateway API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch gateway info" },
      { status: 500 }
    )
  }
}
