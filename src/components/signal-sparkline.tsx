"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"

interface SignalSparklineProps {
  data: number[]
  className?: string
  color?: "green" | "yellow" | "red" | "magenta"
  height?: number
  width?: number
}

export function SignalSparkline({
  data,
  className,
  color = "magenta",
  height = 40,
  width = 100,
}: SignalSparklineProps) {
  const pathD = useMemo(() => {
    if (data.length < 2) return ""

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width
      const y = height - ((value - min) / range) * (height - 4) - 2
      return `${x},${y}`
    })

    return `M ${points.join(" L ")}`
  }, [data, height, width])

  const colorClasses = {
    green: "stroke-green-500",
    yellow: "stroke-yellow-500",
    red: "stroke-red-500",
    magenta: "stroke-magenta-500",
  }

  const gradientId = useMemo(() => `gradient-${Math.random().toString(36).substr(2, 9)}`, [])

  const areaPathD = useMemo(() => {
    if (data.length < 2) return ""

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width
      const y = height - ((value - min) / range) * (height - 4) - 2
      return `${x},${y}`
    })

    return `M 0,${height} L ${points.join(" L ")} L ${width},${height} Z`
  }, [data, height, width])

  if (data.length < 2) {
    return (
      <div
        className={cn("flex items-center justify-center text-xs text-muted-foreground", className)}
        style={{ width, height }}
      >
        Collecting...
      </div>
    )
  }

  return (
    <svg
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop
            offset="0%"
            className={cn(
              color === "green" && "stop-green-500/30",
              color === "yellow" && "stop-yellow-500/30",
              color === "red" && "stop-red-500/30",
              color === "magenta" && "stop-magenta-500/30"
            )}
            stopColor={
              color === "green"
                ? "rgb(34 197 94 / 0.3)"
                : color === "yellow"
                  ? "rgb(234 179 8 / 0.3)"
                  : color === "red"
                    ? "rgb(239 68 68 / 0.3)"
                    : "rgb(236 72 153 / 0.3)"
            }
          />
          <stop
            offset="100%"
            stopColor={
              color === "green"
                ? "rgb(34 197 94 / 0)"
                : color === "yellow"
                  ? "rgb(234 179 8 / 0)"
                  : color === "red"
                    ? "rgb(239 68 68 / 0)"
                    : "rgb(236 72 153 / 0)"
            }
          />
        </linearGradient>
      </defs>
      <path d={areaPathD} fill={`url(#${gradientId})`} />
      <path
        d={pathD}
        fill="none"
        className={cn(colorClasses[color])}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current value dot */}
      {data.length > 0 && (
        <circle
          cx={width}
          cy={
            height -
            ((data[data.length - 1] - Math.min(...data)) / (Math.max(...data) - Math.min(...data) || 1)) *
              (height - 4) -
            2
          }
          r={3}
          className={cn(
            color === "green" && "fill-green-500",
            color === "yellow" && "fill-yellow-500",
            color === "red" && "fill-red-500",
            color === "magenta" && "fill-magenta-500"
          )}
        />
      )}
    </svg>
  )
}
