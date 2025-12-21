"use client"

import { useCallback } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { SignalBars } from "@/components/signal-bars"
import { SignalBarChart } from "@/components/signal-chart"
import { RefreshControl } from "@/components/refresh-control"
import { useGatewayInfo, useClients } from "@/hooks/use-router-data"
import { formatUptime } from "@/lib/utils"
import {
  Wifi,
  Radio,
  Clock,
  Smartphone,
  Activity,
} from "lucide-react"

export default function Dashboard() {
  const { data: gateway, isLoading: gatewayLoading, mutate: mutateGateway } = useGatewayInfo()
  const { data: clients, isLoading: clientsLoading, mutate: mutateClients } = useClients()

  const handleRefresh = useCallback(() => {
    mutateGateway()
    mutateClients()
  }, [mutateGateway, mutateClients])

  const signal5g = gateway?.signal?.["5g"]
  const device = gateway?.device
  const time = gateway?.time
  const generic = gateway?.signal?.generic

  const totalClients = clients?.clients
    ? (clients.clients.wifi?.length || 0) +
      (clients.clients.ethernet?.length || 0)
    : 0

  return (
    <div className="space-y-8">
      {/* Header with Refresh Control */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your T-Mobile 5G Gateway in real-time
          </p>
        </div>
        <RefreshControl onRefresh={handleRefresh} isLoading={gatewayLoading || clientsLoading} />
      </div>

      {/* Hero Section with Gateway Image */}
      <div className="glass-card border-0 rounded-2xl p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Gateway Image */}
          <div className="relative w-48 h-48 lg:w-56 lg:h-56 flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-magenta-500/20 to-blue-500/20 rounded-2xl blur-xl" />
            <div className="relative h-full w-full flex items-center justify-center">
              <Image
                src="/g5ar.png"
                alt="TMO-G5AR Gateway"
                width={200}
                height={200}
                className="object-contain drop-shadow-2xl"
                priority
              />
            </div>
          </div>

          {/* Gateway Info */}
          <div className="flex-1 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
                {device?.model || "T-Mobile Gateway"}
              </h1>
              {generic?.registration && (
                <Badge
                  variant={generic.registration === "registered" ? "success" : "destructive"}
                  className="px-3 py-1"
                >
                  <span className="relative flex h-2 w-2 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                  </span>
                  {generic.registration === "registered" ? "Connected" : "Disconnected"}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mb-4">
              {device?.manufacturer || "Arcadyan"} • v{device?.softwareVersion || "---"}
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-6 mt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-magenta-500/10 flex items-center justify-center">
                  <Radio className="h-5 w-5 text-magenta-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <SignalBars bars={Math.round(signal5g?.bars || 0)} size="sm" />
                    <span className="font-bold">{signal5g?.bars || 0}/5</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Signal</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <div className="font-bold">{totalClients}</div>
                  <p className="text-xs text-muted-foreground">Devices</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <div className="font-bold">{time ? formatUptime(time.upTime) : "---"}</div>
                  <p className="text-xs text-muted-foreground">Uptime</p>
                </div>
              </div>

              {signal5g && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Wifi className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <Badge variant="magenta">{signal5g.bands.join(", ")}</Badge>
                    <p className="text-xs text-muted-foreground mt-0.5">Band</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Signal Metrics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-magenta-500" />
              5G Signal Metrics
            </CardTitle>
            <CardDescription>
              Real-time signal quality with color-coded indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gatewayLoading ? (
              <div className="space-y-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : signal5g ? (
              <SignalBarChart
                rsrp={signal5g.rsrp}
                rsrq={signal5g.rsrq}
                sinr={signal5g.sinr}
                rssi={signal5g.rssi}
              />
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No 5G signal data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-magenta-500" />
              Connection Details
            </CardTitle>
            <CardDescription>
              Network and tower information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gatewayLoading ? (
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : signal5g ? (
              <div className="space-y-3">
                <div className="flex justify-between py-3 border-b border-border/50">
                  <span className="text-muted-foreground">Band</span>
                  <Badge variant="magenta">{signal5g.bands.join(", ")}</Badge>
                </div>
                <div className="flex justify-between py-3 border-b border-border/50">
                  <span className="text-muted-foreground">gNB ID</span>
                  <span className="font-mono text-sm font-medium">{signal5g.gNBID}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border/50">
                  <span className="text-muted-foreground">Cell ID</span>
                  <span className="font-mono text-sm font-medium">{signal5g.cid}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border/50">
                  <span className="text-muted-foreground">RSSI</span>
                  <span className="font-medium">{signal5g.rssi} dBm</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border/50">
                  <span className="text-muted-foreground">Antenna</span>
                  <span className="font-medium">{signal5g.antennaUsed.replace(/_/g, " ")}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-muted-foreground">APN</span>
                  <span className="font-medium">{generic?.apn || "N/A"}</span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No connection data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
