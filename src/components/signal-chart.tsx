"use client"

import { useMemo } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

interface SignalChartProps {
  data: { time: string; value: number }[]
  color?: string
  min?: number
  max?: number
  label?: string
  unit?: string
}

export function SignalChart({
  data,
  color = "#E20074",
  min = -140,
  max = -44,
  label = "Signal",
  unit = "dBm",
}: SignalChartProps) {
  const gradientId = useMemo(() => `gradient-${Math.random().toString(36).substr(2, 9)}`, [])

  return (
    <div className="w-full h-32">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            domain={[min, max]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            width={35}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="glass-card px-3 py-2 rounded-lg">
                    <p className="text-sm font-medium">
                      {payload[0].value} {unit}
                    </p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

interface SignalBarChartProps {
  rsrp: number
  rsrq: number
  sinr: number
  rssi: number
}

export function SignalBarChart({ rsrp, rsrq, sinr, rssi }: SignalBarChartProps) {
  const getColor = (value: number, type: "rsrp" | "rsrq" | "sinr" | "rssi") => {
    switch (type) {
      case "rsrp":
        if (value >= -80) return "#22c55e"
        if (value >= -90) return "#84cc16"
        if (value >= -100) return "#eab308"
        if (value >= -110) return "#f97316"
        return "#ef4444"
      case "rsrq":
        if (value >= -10) return "#22c55e"
        if (value >= -15) return "#eab308"
        return "#ef4444"
      case "sinr":
        if (value >= 20) return "#22c55e"
        if (value >= 13) return "#84cc16"
        if (value >= 0) return "#eab308"
        return "#ef4444"
      case "rssi":
        if (value >= -65) return "#22c55e"
        if (value >= -75) return "#84cc16"
        if (value >= -85) return "#eab308"
        return "#ef4444"
    }
  }

  const getPercentage = (value: number, type: "rsrp" | "rsrq" | "sinr" | "rssi") => {
    switch (type) {
      case "rsrp":
        return Math.max(0, Math.min(100, ((value + 140) / 96) * 100))
      case "rsrq":
        return Math.max(0, Math.min(100, ((value + 20) / 17) * 100))
      case "sinr":
        return Math.max(0, Math.min(100, ((value + 10) / 40) * 100))
      case "rssi":
        return Math.max(0, Math.min(100, ((value + 100) / 70) * 100))
    }
  }

  const metrics = [
    { label: "RSRP", value: rsrp, unit: "dBm", type: "rsrp" as const },
    { label: "RSRQ", value: rsrq, unit: "dB", type: "rsrq" as const },
    { label: "SINR", value: sinr, unit: "dB", type: "sinr" as const },
    { label: "RSSI", value: rssi, unit: "dBm", type: "rssi" as const },
  ]

  return (
    <div className="space-y-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{metric.label}</span>
            <span className="text-muted-foreground">
              {metric.value} {metric.unit}
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 animate-signal"
              style={{
                width: `${getPercentage(metric.value, metric.type)}%`,
                backgroundColor: getColor(metric.value, metric.type),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
