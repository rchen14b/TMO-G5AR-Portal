"use client"

import { cn } from "@/lib/utils"

interface SignalGaugeProps {
  value: number
  min: number
  max: number
  label: string
  unit?: string
  showValue?: boolean
  size?: "sm" | "md" | "lg"
  colorStops?: { value: number; color: string }[]
}

export function SignalGauge({
  value,
  min,
  max,
  label,
  unit = "",
  showValue = true,
  size = "md",
  colorStops = [
    { value: 0, color: "#ef4444" },
    { value: 33, color: "#f97316" },
    { value: 66, color: "#eab308" },
    { value: 100, color: "#22c55e" },
  ],
}: SignalGaugeProps) {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))

  const getColor = () => {
    for (let i = colorStops.length - 1; i >= 0; i--) {
      if (percentage >= colorStops[i].value) {
        return colorStops[i].color
      }
    }
    return colorStops[0].color
  }

  const sizeClasses = {
    sm: "h-24 w-24",
    md: "h-32 w-32",
    lg: "h-40 w-40",
  }

  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  }

  const labelSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }

  const strokeWidth = size === "sm" ? 8 : size === "md" ? 10 : 12
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference * 0.75

  return (
    <div className="flex flex-col items-center">
      <div className={cn("relative", sizeClasses[size])}>
        <svg className="w-full h-full -rotate-[135deg]" viewBox="0 0 100 100">
          {/* Background arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            className="text-muted"
          />
          {/* Value arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("font-bold", textSizes[size])}>
              {value}
            </span>
            {unit && (
              <span className={cn("text-muted-foreground", labelSizes[size])}>
                {unit}
              </span>
            )}
          </div>
        )}
      </div>
      <span className={cn("mt-2 font-medium text-muted-foreground", labelSizes[size])}>
        {label}
      </span>
    </div>
  )
}
