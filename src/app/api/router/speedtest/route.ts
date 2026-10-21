import { NextResponse } from "next/server"
import { isSpeedTestRunning, readSpeedTests, runSpeedTest } from "@/lib/speed-test"

export const dynamic = "force-dynamic"

// GET: every stored speed test, oldest first, and whether one is running.
export async function GET() {
  try {
    const results = await readSpeedTests()
    return NextResponse.json({ running: isSpeedTestRunning(), results })
  } catch (error) {
    console.error("Speed test API error:", error)
    return NextResponse.json({ error: "Failed to read speed tests" }, { status: 500 })
  }
}

// POST: run a test (about 20 seconds) and return the result.
export async function POST() {
  try {
    const result = await runSpeedTest()
    if (!result) {
      return NextResponse.json({ error: "A speed test is already running" }, { status: 409 })
    }
    return NextResponse.json({ result })
  } catch (error) {
    console.error("Speed test API error:", error)
    return NextResponse.json({ error: "Speed test failed" }, { status: 500 })
  }
}
