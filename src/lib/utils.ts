import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)

  return parts.join(" ") || "0m"
}

export function getSignalQuality(rsrp: number): { label: string; color: string } {
  if (rsrp >= -80) return { label: "Excellent", color: "text-green-500" }
  if (rsrp >= -90) return { label: "Good", color: "text-green-400" }
  if (rsrp >= -100) return { label: "Fair", color: "text-yellow-500" }
  if (rsrp >= -110) return { label: "Poor", color: "text-orange-500" }
  return { label: "No Signal", color: "text-red-500" }
}

export function getSinrQuality(sinr: number): { label: string; color: string } {
  if (sinr >= 20) return { label: "Excellent", color: "text-green-500" }
  if (sinr >= 13) return { label: "Good", color: "text-green-400" }
  if (sinr >= 0) return { label: "Fair", color: "text-yellow-500" }
  return { label: "Poor", color: "text-red-500" }
}

export function getBarsColor(bars: number): string {
  if (bars >= 4) return "text-green-500"
  if (bars >= 3) return "text-green-400"
  if (bars >= 2) return "text-yellow-500"
  return "text-red-500"
}
