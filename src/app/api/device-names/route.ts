import { NextRequest, NextResponse } from "next/server"
import { getDeviceNames, setDeviceName, removeDeviceName } from "@/lib/device-names"

export async function GET() {
  try {
    const names = await getDeviceNames()
    return NextResponse.json(names)
  } catch (error) {
    console.error("Device names GET error:", error)
    return NextResponse.json({ error: "Failed to read device names" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { mac, name } = await request.json()
    if (!mac || typeof name !== "string") {
      return NextResponse.json({ error: "mac and name required" }, { status: 400 })
    }
    if (name.trim()) {
      await setDeviceName(mac, name.trim())
    } else {
      await removeDeviceName(mac)
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Device names POST error:", error)
    return NextResponse.json({ error: "Failed to save device name" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const mac = new URL(request.url).searchParams.get("mac")
    if (!mac) {
      return NextResponse.json({ error: "mac required" }, { status: 400 })
    }
    await removeDeviceName(mac)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Device names DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete device name" }, { status: 500 })
  }
}
