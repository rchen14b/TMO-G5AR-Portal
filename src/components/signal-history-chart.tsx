"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

export interface HistoryPoint {
  t: number // epoch ms
  value: number
}

interface SignalHistoryChartProps {
  data: HistoryPoint[]
  color?: string
  unit?: string
  label?: string
  domain?: [number | "auto", number | "auto"]
}

const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

const fmtFull = (t: number) =>
  new Date(t).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

export function SignalHistoryChart({
  data,
  color = "#E20074",
  unit = "dBm",
  label = "Signal",
  domain = ["auto", "auto"],
}: SignalHistoryChartProps) {
  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            opacity={0.3}
            vertical={false}
          />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={fmtTime}
            minTickGap={48}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={domain}
            width={40}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const p = payload[0]
                return (
                  <div className="glass-card px-3 py-2 rounded-lg">
                    <p className="text-sm font-medium">
                      {p.value} {unit}
                    </p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtFull(p.payload.t)}
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
