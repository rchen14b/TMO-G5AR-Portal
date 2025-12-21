"use client"

import { useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useClients } from "@/hooks/use-router-data"
import { SignalBars } from "@/components/signal-bars"
import { RefreshControl } from "@/components/refresh-control"
import { Smartphone, Monitor, Wifi, Cable } from "lucide-react"
import { Client } from "@/lib/router-api"

type ClientWithType = Client & { type: "wifi" | "ethernet" | "2.4ghz" | "5.0ghz" }

export default function DevicesPage() {
  const { data, isLoading, mutate } = useClients()

  const handleRefresh = useCallback(() => {
    mutate()
  }, [mutate])

  const allClients: ClientWithType[] = data?.clients
    ? [
        ...(data.clients.wifi || []).map((c: Client) => ({ ...c, type: "wifi" as const })),
        ...(data.clients.ethernet || []).map((c: Client) => ({ ...c, type: "ethernet" as const })),
        ...(data.clients["2.4ghz"] || []).map((c: Client) => ({ ...c, type: "2.4ghz" as const })),
        ...(data.clients["5.0ghz"] || []).map((c: Client) => ({ ...c, type: "5.0ghz" as const })),
      ]
    : []

  const uniqueClients = allClients.filter(
    (client, index, self) =>
      index === self.findIndex((c) => c.mac === client.mac)
  )

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "ethernet":
        return <Cable className="h-4 w-4" />
      default:
        return <Wifi className="h-4 w-4" />
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "ethernet":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Ethernet</Badge>
      case "2.4ghz":
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">2.4 GHz</Badge>
      case "5.0ghz":
        return <Badge variant="magenta">5 GHz</Badge>
      default:
        return <Badge variant="secondary">WiFi</Badge>
    }
  }

  const getSignalBars = (signal?: number) => {
    if (signal === undefined) return null
    const bars = Math.max(1, Math.min(5, Math.round((signal + 90) / 12) + 1))
    return <SignalBars bars={bars} size="sm" />
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Connected Devices</h1>
          <p className="text-muted-foreground mt-1">
            View and manage devices connected to your network
          </p>
        </div>
        <RefreshControl onRefresh={handleRefresh} isLoading={isLoading} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-card border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Devices</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-magenta-500/10 flex items-center justify-center">
              <Monitor className="h-4 w-4 text-magenta-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading ? <Skeleton className="h-9 w-12" /> : uniqueClients.length}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">WiFi Devices</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Wifi className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading ? (
                <Skeleton className="h-9 w-12" />
              ) : (
                uniqueClients.filter((c) => c.type !== "ethernet").length
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ethernet Devices</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Cable className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading ? (
                <Skeleton className="h-9 w-12" />
              ) : (
                uniqueClients.filter((c) => c.type === "ethernet").length
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle>Device List</CardTitle>
          <CardDescription>
            All devices currently connected to your gateway
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : uniqueClients.length === 0 ? (
            <div className="py-12 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No devices connected</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold">Device</TableHead>
                    <TableHead className="font-semibold">IP Address</TableHead>
                    <TableHead className="font-semibold">MAC Address</TableHead>
                    <TableHead className="font-semibold">Connection</TableHead>
                    <TableHead className="font-semibold">Signal</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uniqueClients.map((client) => (
                    <TableRow key={client.mac} className="hover:bg-muted/20">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50">
                            {getTypeIcon(client.type)}
                          </div>
                          <div className="font-medium">
                            {client.name || "Unknown Device"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted/50 px-2 py-1 rounded-lg">{client.ipv4}</code>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs text-muted-foreground">
                          {client.mac}
                        </code>
                      </TableCell>
                      <TableCell>{getTypeBadge(client.type)}</TableCell>
                      <TableCell>
                        {client.signal !== undefined ? (
                          <div className="flex items-center gap-2">
                            {getSignalBars(client.signal)}
                            <span className="text-xs text-muted-foreground">
                              {client.signal} dBm
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={client.connected ? "success" : "secondary"}>
                          {client.connected ? "Online" : "Offline"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
