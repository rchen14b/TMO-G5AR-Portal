import { NextResponse } from "next/server"
import { getClients, Client } from "@/lib/router-api"
import { getDeviceNames } from "@/lib/device-names"

function mergeNames(clients: Client[], names: Record<string, string>): Client[] {
  return clients.map((c) => ({ ...c, name: names[c.mac] || c.name }))
}

export async function GET() {
  try {
    const [data, customNames] = await Promise.all([getClients(), getDeviceNames()])

    return NextResponse.json({
      clients: {
        "2.4ghz": mergeNames(data.clients["2.4ghz"] || [], customNames),
        "5.0ghz": mergeNames(data.clients["5.0ghz"] || [], customNames),
        ...(data.clients["6.0ghz"]
          ? { "6.0ghz": mergeNames(data.clients["6.0ghz"]!, customNames) }
          : {}),
        ethernet: mergeNames(data.clients.ethernet || [], customNames),
        wifi: mergeNames(data.clients.wifi || [], customNames),
      },
    })
  } catch (error) {
    console.error("Clients API error:", error)
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 })
  }
}
