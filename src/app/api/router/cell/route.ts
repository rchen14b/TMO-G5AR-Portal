import { NextResponse } from "next/server"
import { getCellInfo } from "@/lib/router-api"

export async function GET() {
  try {
    const data = await getCellInfo()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Cell API error:", error)
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    return NextResponse.json(
      { error: "Failed to fetch cell info" },
      { status: 500 }
    )
  }
}
