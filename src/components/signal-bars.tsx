"use client"

import { cn } from "@/lib/utils"

interface SignalBarsProps {
  bars: number
  maxBars?: number
  size?: "sm" | "md" | "lg"
}

export function SignalBars({ bars, maxBars = 5, size = "md" }: SignalBarsProps) {
  const heights = {
    sm: [8, 12, 16, 20, 24],
    md: [12, 18, 24, 30, 36],
    lg: [16, 24, 32, 40, 48],
  }

  const widths = {
    sm: "w-1.5",
    md: "w-2",
    lg: "w-3",
  }

  const gaps = {
    sm: "gap-0.5",
    md: "gap-1",
    lg: "gap-1.5",
  }

  const getColor = (index: number) => {
    if (index >= bars) return "bg-muted"
    if (bars >= 4) return "bg-green-500"
    if (bars >= 3) return "bg-yellow-500"
    if (bars >= 2) return "bg-orange-500"
    return "bg-red-500"
  }

  return (
    <div className={cn("flex items-end", gaps[size])}>
      {Array.from({ length: maxBars }).map((_, index) => (
        <div
          key={index}
          className={cn(
            widths[size],
            "rounded-sm transition-colors",
            getColor(index)
          )}
          style={{ height: heights[size][index] }}
        />
      ))}
    </div>
  )
}
