"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { SignalHistoryChart, type HistoryPoint } from "@/components/signal-history-chart"
import { useSignalHistory, type SignalSample } from "@/hooks/use-router-data"
import { cn } from "@/lib/utils"
import { LineChart, Clock } from "lucide-react"

const RANGES = [
  { label: "1h", hours: 1 },
  { label: "6h", hours: 6 },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 168 },
]

interface MetricDef {
  key: "rsrp" | "rsrq" | "sinr" | "rssi"
  label: string
  unit: string
  color: string
  domain: [number, number]
  description: string
}

const METRICS: MetricDef[] = [
  {
    key: "rsrp",
    label: "RSRP",
    unit: "dBm",
    color: "#E20074",
    domain: [-120, -60],
    description: "Reference Signal Received Power — raw signal strength",
  },
  {
    key: "sinr",
    label: "SINR",
    unit: "dB",
    color: "#22c55e",
    domain: [-10, 40],
    description: "Signal-to-noise ratio — quality / achievable throughput",
  },
  {
    key: "rsrq",
    label: "RSRQ",
    unit: "dB",
    color: "#3b82f6",
    domain: [-20, -3],
    description: "Reference Signal Received Quality",
  },
  {
    key: "rssi",
    label: "RSSI",
    unit: "dBm",
    color: "#f59e0b",
    domain: [-100, -50],
    description: "Total received power including noise",
  },
]

function stats(values: number[]) {
  if (values.length === 0) return null
  const sum = values.reduce((a, b) => a + b, 0)
  return {
    current: values[values.length - 1],
    min: Math.min(...values),
    max: Math.max(...values),
    avg: Math.round((sum / values.length) * 10) / 10,
  }
}

export default function HistoryPage() {
  const [hours, setHours] = useState(24)
  const { data, isLoading } = useSignalHistory(hours)

  const entries: SignalSample[] = data?.entries ?? []
  const latest = entries[entries.length - 1]
  const bands = latest?.bands ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LineChart className="h-6 w-6 text-primary" />
            Signal History
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Recorded 5G signal quality over time — useful for comparing antenna
            placement and tracking performance.
          </p>
        </div>

        {/* Range selector */}
        <div className="flex items-center gap-1 rounded-lg border p-1 self-start">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setHours(r.hours)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                hours === r.hours
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary bar */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {entries.length} sample{entries.length === 1 ? "" : "s"} in the last {hours}h
          </span>
          {bands.length > 0 && (
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground">Band:</span>
              {bands.map((b) => (
                <Badge key={b} variant="secondary">
                  {b}
                </Badge>
              ))}
            </span>
          )}
          {latest && (
            <span className="text-muted-foreground">
              Last sample:{" "}
              {new Date(latest.t).toLocaleString([], {
                hour: "2-digit",
                minute: "2-digit",
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </CardContent>
      </Card>

      {/* Empty state */}
      {!isLoading && entries.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <LineChart className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No history recorded yet</p>
            <p className="text-sm mt-1">
              The server polls the gateway in the background. Check back in a few
              minutes — samples are collected about once a minute.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Metric charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {METRICS.map((metric) => {
          const points: HistoryPoint[] = entries.map((e) => ({
            t: e.t,
            value: e[metric.key],
          }))
          const s = stats(points.map((p) => p.value))

          return (
            <Card key={metric.key}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{metric.label}</CardTitle>
                    <CardDescription className="text-xs">
                      {metric.description}
                    </CardDescription>
                  </div>
                  {s && (
                    <div className="text-right">
                      <div className="text-xl font-bold" style={{ color: metric.color }}>
                        {s.current}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          {metric.unit}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        min {s.min} · avg {s.avg} · max {s.max}
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoading && entries.length === 0 ? (
                  <Skeleton className="w-full h-56" />
                ) : (
                  <SignalHistoryChart
                    data={points}
                    color={metric.color}
                    unit={metric.unit}
                    label={metric.label}
                    domain={metric.domain}
                  />
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
