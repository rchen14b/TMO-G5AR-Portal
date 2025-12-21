"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { SignalBarChart } from "@/components/signal-chart"
import { SignalBars } from "@/components/signal-bars"
import { SignalSparkline } from "@/components/signal-sparkline"
import { RefreshControl } from "@/components/refresh-control"
import { useCellInfo, useSimInfo, useGatewayInfo } from "@/hooks/use-router-data"
import { getSignalQuality, getSinrQuality } from "@/lib/utils"
import { Radio, Antenna, MapPin, CreditCard, Gauge } from "lucide-react"

const MAX_HISTORY = 30 // Keep last 30 data points

interface SignalHistory {
  rsrp: number[]
  rsrq: number[]
  sinr: number[]
  rssi: number[]
}

export default function CellPage() {
  const { data: cell, isLoading: cellLoading, mutate: mutateCell } = useCellInfo()
  const { data: sim, isLoading: simLoading, mutate: mutateSim } = useSimInfo()
  const { data: gateway } = useGatewayInfo()

  // Track signal history
  const [history, setHistory] = useState<SignalHistory>({
    rsrp: [],
    rsrq: [],
    sinr: [],
    rssi: [],
  })
  const lastValuesRef = useRef<{ rsrp?: number; rsrq?: number; sinr?: number; rssi?: number }>({})

  const handleRefresh = useCallback(() => {
    mutateCell()
    mutateSim()
  }, [mutateCell, mutateSim])

  const signal5g = cell?.cell?.["5g"]
  const sector = signal5g?.sector
  const gps = cell?.cell?.gps
  const generic = cell?.cell?.generic

  // Update history when sector data changes
  useEffect(() => {
    if (sector) {
      const { rsrp, rsrq, sinr, rssi } = sector
      const last = lastValuesRef.current

      // Only add to history if values actually changed
      if (rsrp !== last.rsrp || rsrq !== last.rsrq || sinr !== last.sinr || rssi !== last.rssi) {
        lastValuesRef.current = { rsrp, rsrq, sinr, rssi }

        setHistory((prev) => ({
          rsrp: [...prev.rsrp, rsrp].slice(-MAX_HISTORY),
          rsrq: [...prev.rsrq, rsrq].slice(-MAX_HISTORY),
          sinr: [...prev.sinr, sinr].slice(-MAX_HISTORY),
          rssi: [...prev.rssi, rssi].slice(-MAX_HISTORY),
        }))
      }
    }
  }, [sector])

  // Helper to get sparkline color based on quality
  const getRsrpColor = (value: number) => (value >= -90 ? "green" : value >= -100 ? "yellow" : "red")
  const getRsrqColor = (value: number) => (value >= -10 ? "green" : value >= -15 ? "yellow" : "red")
  const getSinrColor = (value: number) => (value >= 13 ? "green" : value >= 0 ? "yellow" : "red")
  const getRssiColor = (value: number) => (value >= -65 ? "green" : value >= -75 ? "yellow" : "red")

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cell Information</h1>
          <p className="text-muted-foreground mt-1">
            Detailed 5G cellular network information
          </p>
        </div>
        <RefreshControl onRefresh={handleRefresh} isLoading={cellLoading || simLoading} />
      </div>

      {/* Signal Quality Card */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-magenta-500" />
            Signal Quality
          </CardTitle>
          <CardDescription>
            Real-time 5G signal metrics with color-coded quality indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cellLoading ? (
            <div className="space-y-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : sector ? (
            <div className="grid gap-8 lg:grid-cols-2">
              <SignalBarChart
                rsrp={sector.rsrp}
                rsrq={sector.rsrq}
                sinr={sector.sinr}
                rssi={sector.rssi}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/30 flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold">{sector.rsrp}</span>
                      <span className="text-sm text-muted-foreground">RSRP (dBm)</span>
                    </div>
                    <Badge variant={sector.rsrp >= -90 ? "success" : sector.rsrp >= -100 ? "warning" : "destructive"}>
                      {getSignalQuality(sector.rsrp).label}
                    </Badge>
                  </div>
                  <div className="flex-1 mt-2 min-h-[60px]">
                    <SignalSparkline
                      data={history.rsrp}
                      color={getRsrpColor(sector.rsrp)}
                      width={160}
                      height={60}
                    />
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold">{sector.rsrq}</span>
                      <span className="text-sm text-muted-foreground">RSRQ (dB)</span>
                    </div>
                    <Badge variant={sector.rsrq >= -10 ? "success" : sector.rsrq >= -15 ? "warning" : "destructive"}>
                      {sector.rsrq >= -10 ? "Good" : sector.rsrq >= -15 ? "Fair" : "Poor"}
                    </Badge>
                  </div>
                  <div className="flex-1 mt-2 min-h-[60px]">
                    <SignalSparkline
                      data={history.rsrq}
                      color={getRsrqColor(sector.rsrq)}
                      width={160}
                      height={60}
                    />
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold">{sector.sinr}</span>
                      <span className="text-sm text-muted-foreground">SINR (dB)</span>
                    </div>
                    <Badge variant={sector.sinr >= 13 ? "success" : sector.sinr >= 0 ? "warning" : "destructive"}>
                      {getSinrQuality(sector.sinr).label}
                    </Badge>
                  </div>
                  <div className="flex-1 mt-2 min-h-[60px]">
                    <SignalSparkline
                      data={history.sinr}
                      color={getSinrColor(sector.sinr)}
                      width={160}
                      height={60}
                    />
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold">{sector.rssi}</span>
                      <span className="text-sm text-muted-foreground">RSSI (dBm)</span>
                    </div>
                    <Badge variant={sector.rssi >= -65 ? "success" : sector.rssi >= -75 ? "warning" : "destructive"}>
                      {sector.rssi >= -65 ? "Excellent" : sector.rssi >= -75 ? "Good" : "Fair"}
                    </Badge>
                  </div>
                  <div className="flex-1 mt-2 min-h-[60px]">
                    <SignalSparkline
                      data={history.rssi}
                      color={getRssiColor(sector.rssi)}
                      width={160}
                      height={60}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              No cell signal data available
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tower Information */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Antenna className="h-5 w-5 text-magenta-500" />
              Tower Information
            </CardTitle>
            <CardDescription>
              Connected cell tower details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cellLoading ? (
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex justify-between p-3 rounded-xl bg-muted/30">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : sector ? (
              <div className="space-y-3">
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">Band</span>
                  <Badge variant="magenta">{sector.bands.join(", ")}</Badge>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">gNB ID</span>
                  <span className="font-mono text-sm font-medium">{sector.gNBID}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">Cell ID</span>
                  <span className="font-mono text-sm font-medium">{sector.cid}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">ECGI</span>
                  <span className="font-mono text-xs font-medium">{signal5g?.ecgi || "N/A"}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">CQI</span>
                  <span className="font-medium">{signal5g?.cqi || "N/A"}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">Signal Bars</span>
                  <div className="flex items-center gap-2">
                    <SignalBars bars={Math.round(sector.bars)} size="sm" />
                    <span className="text-sm">{sector.bars}/5</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No tower data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* SIM Information */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-magenta-500" />
              SIM Information
            </CardTitle>
            <CardDescription>
              SIM card and subscriber details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {simLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex justify-between p-3 rounded-xl bg-muted/30">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ))}
              </div>
            ) : sim?.sim ? (
              <div className="space-y-3">
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={sim.sim.status ? "success" : "destructive"}>
                    {sim.sim.status ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">ICCID</span>
                  <span className="font-mono text-xs font-medium">{sim.sim.iccId}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">IMEI</span>
                  <span className="font-mono text-xs font-medium">{sim.sim.imei}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">IMSI</span>
                  <span className="font-mono text-xs font-medium">{sim.sim.imsi}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">Phone Number</span>
                  <span className="font-medium">{sim.sim.msisdn || "Not available"}</span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No SIM data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connection Details */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-magenta-500" />
              Connection Details
            </CardTitle>
            <CardDescription>
              Network connection information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cellLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex justify-between p-3 rounded-xl bg-muted/30">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : generic ? (
              <div className="space-y-3">
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">Registration</span>
                  <Badge variant={generic.registration === "registered" ? "success" : "secondary"}>
                    {generic.registration}
                  </Badge>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">APN</span>
                  <span className="font-medium">{generic.apn}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">IPv6</span>
                  <Badge variant={generic.hasIPv6 ? "success" : "secondary"}>
                    {generic.hasIPv6 ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No connection data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* GPS Location */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-magenta-500" />
              GPS Location
            </CardTitle>
            <CardDescription>
              Gateway location (if available)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cellLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : gps && (gps.latitude !== 0 || gps.longitude !== 0) ? (
              <div className="space-y-3">
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">Latitude</span>
                  <span className="font-mono font-medium">{gps.latitude.toFixed(6)}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">Longitude</span>
                  <span className="font-mono font-medium">{gps.longitude.toFixed(6)}</span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <MapPin className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">GPS location not available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
