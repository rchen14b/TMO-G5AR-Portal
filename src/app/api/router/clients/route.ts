import { NextResponse } from "next/server"
import { getClients } from "@/lib/router-api"

export async function GET() {
  try {
    const data = await getClients()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Clients API error:", error)
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    )
  }
}
