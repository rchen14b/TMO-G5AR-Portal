import { NextRequest, NextResponse } from "next/server"
import {
  ensurePoller,
  getSurveyState,
  setSurveyLocation,
  readSurveySamples,
  deleteSurveyLocation,
} from "@/lib/signal-history"
import { deleteSpeedTests } from "@/lib/speed-test"

export const dynamic = "force-dynamic"

// GET: the active survey location (if any) and every survey-tagged sample.
export async function GET() {
  ensurePoller()

  try {
    const [active, entries] = await Promise.all([getSurveyState(), readSurveySamples()])
    return NextResponse.json({ active, entries })
  } catch (error) {
    console.error("Survey API error:", error)
    return NextResponse.json({ error: "Failed to read survey data" }, { status: 500 })
  }
}

// POST { location: string | null }: set the location new samples are tagged
// with, or stop tagging with null.
export async function POST(request: NextRequest) {
  ensurePoller()

  const body = await request.json().catch(() => ({}))
  const raw = typeof body?.location === "string" ? body.location.trim().slice(0, 60) : ""

  try {
    const active = await setSurveyLocation(raw || null)
    return NextResponse.json({ active })
  } catch (error) {
    console.error("Survey API error:", error)
    return NextResponse.json({ error: "Failed to set survey location" }, { status: 500 })
  }
}

// DELETE ?location=X: remove that location's survey samples and speed tests.
export async function DELETE(request: NextRequest) {
  const location = request.nextUrl.searchParams.get("location")
  if (!location) {
    return NextResponse.json({ error: "location is required" }, { status: 400 })
  }

  try {
    await Promise.all([deleteSurveyLocation(location), deleteSpeedTests(location)])
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Survey API error:", error)
    return NextResponse.json({ error: "Failed to delete survey data" }, { status: 500 })
  }
}
