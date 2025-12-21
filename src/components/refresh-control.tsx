"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Play, Pause, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { useGatewayHealth } from "@/hooks/use-router-data"

interface RefreshControlProps {
  onRefresh: () => void
  isLoading?: boolean
}

export function RefreshControl({ onRefresh, isLoading }: RefreshControlProps) {
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [interval, setInterval_] = useState(1000)
  const { data: health } = useGatewayHealth()

  // Use ref to always have the latest callback without recreating interval
  const onRefreshRef = useRef(onRefresh)
  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  const isOffline = health?.status === "offline" || health?.status === "error"

  // Stop auto-refresh when gateway goes offline
  useEffect(() => {
    if (isOffline && autoRefresh) {
      setAutoRefresh(false)
    }
  }, [isOffline, autoRefresh])

  useEffect(() => {
    if (!autoRefresh || isOffline) return

    const timer = setInterval(() => {
      onRefreshRef.current()
    }, interval)

    return () => clearInterval(timer)
  }, [autoRefresh, interval, isOffline])

  const toggleAutoRefresh = () => {
    if (!isOffline) {
      setAutoRefresh(!autoRefresh)
    }
  }

  // Show offline indicator when gateway is unreachable
  if (isOffline) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-sm font-medium text-red-500">
            Gateway Offline
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="glass h-9 gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          <span className="hidden sm:inline">Retry</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Online indicator */}
      {health?.status === "online" && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-xs font-medium text-green-600 dark:text-green-400 hidden sm:inline">
            Online
          </span>
        </div>
      )}

      {/* Interval selector - only show when auto-refresh is enabled */}
      {autoRefresh && (
        <select
          value={interval}
          onChange={(e) => setInterval_(Number(e.target.value))}
          className="h-9 px-3 rounded-lg bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-magenta-500"
        >
          <option value={1000}>1s</option>
          <option value={2000}>2s</option>
          <option value={5000}>5s</option>
          <option value={10000}>10s</option>
        </select>
      )}

      {/* Auto-refresh toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={toggleAutoRefresh}
        disabled={isOffline}
        className={cn(
          "glass h-9 gap-2",
          autoRefresh && "bg-green-500/20 border-green-500/30 text-green-600 dark:text-green-400"
        )}
      >
        {autoRefresh ? (
          <>
            <Pause className="h-4 w-4" />
            <span className="hidden sm:inline">Stop</span>
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">Auto</span>
          </>
        )}
      </Button>

      {/* Manual refresh button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isLoading || isOffline}
        className="glass h-9 gap-2"
      >
        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        <span className="hidden sm:inline">Refresh</span>
      </Button>
    </div>
  )
}
