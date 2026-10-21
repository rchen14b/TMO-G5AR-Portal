import { NextRequest, NextResponse } from "next/server"
import { readHistory, ensurePoller } from "@/lib/signal-history"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  ensurePoller() // start background recording if it isn't already running

  const hoursParam = Number(request.nextUrl.searchParams.get("hours"))
  const hours = Number.isFinite(hoursParam) && hoursParam > 0 ? hoursParam : 24
  const sinceMs = Date.now() - hours * 60 * 60 * 1000

  try {
    const entries = await readHistory(sinceMs)
    return NextResponse.json({ hours, count: entries.length, entries })
  } catch (error) {
    console.error("History API error:", error)
    return NextResponse.json(
      { error: "Failed to read signal history" },
      { status: 500 }
    )
  }
}
