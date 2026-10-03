import { NextRequest, NextResponse } from "next/server"
import { getSchedules, setDeviceSchedule, DeviceSchedule } from "@/lib/router-api"

export async function GET(request: NextRequest) {
  const mac = new URL(request.url).searchParams.get("mac")
  if (!mac) {
    return NextResponse.json({ error: "mac required" }, { status: 400 })
  }

  try {
    const data = await getSchedules()
    const schedule: DeviceSchedule = data.schedules?.find((s) => s.mac === mac) ?? {
      mac,
      ban: false,
      isEnabled: false,
      timelines: [],
    }
    return NextResponse.json(schedule)
  } catch (error) {
    console.error("Schedules GET error:", error)
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: DeviceSchedule = await request.json()
    if (!body.mac) {
      return NextResponse.json({ error: "mac required" }, { status: 400 })
    }
    await setDeviceSchedule(body)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Schedules POST error:", error)
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    return NextResponse.json({ error: "Failed to save schedule" }, { status: 500 })
  }
}
