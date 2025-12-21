import { NextResponse } from "next/server"
import { rebootGateway } from "@/lib/router-api"

export async function POST() {
  try {
    await rebootGateway()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Reboot API error:", error)
    return NextResponse.json(
      { error: "Failed to reboot gateway" },
      { status: 500 }
    )
  }
}
