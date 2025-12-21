"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshControl } from "@/components/refresh-control"
import { useGatewayInfo, useVersion } from "@/hooks/use-router-data"
import { formatUptime } from "@/lib/utils"
import {
  Server,
  Power,
  Cpu,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"

export default function SystemPage() {
  const { data: gateway, isLoading, mutate } = useGatewayInfo()
  const { data: versionData } = useVersion()
  const [rebooting, setRebooting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const device = gateway?.device
  const time = gateway?.time
  const apiVersion = versionData?.version

  const handleRefresh = useCallback(() => {
    mutate()
  }, [mutate])

  const handleReboot = async () => {
    setRebooting(true)
    try {
      const response = await fetch("/api/router/reboot", {
        method: "POST",
      })
      if (response.ok) {
        setShowConfirm(false)
      }
    } catch (error) {
      console.error("Reboot failed:", error)
    } finally {
      setRebooting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System</h1>
          <p className="text-muted-foreground mt-1">
            Gateway information and system controls
          </p>
        </div>
        <RefreshControl onRefresh={handleRefresh} isLoading={isLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Device Information */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-magenta-500" />
              Device Information
            </CardTitle>
            <CardDescription>
              Hardware and software details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex justify-between p-3 rounded-xl bg-muted/30">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : device ? (
              <div className="space-y-3">
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-medium">{device.model}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">Manufacturer</span>
                  <span className="font-medium">{device.manufacturer}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">Serial Number</span>
                  <span className="font-mono text-sm font-medium">{device.serial}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">MAC Address</span>
                  <span className="font-mono text-sm font-medium">{device.macId}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">Hardware Version</span>
                  <span className="font-medium">{device.hardwareVersion}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">Software Version</span>
                  <Badge variant="magenta">v{device.softwareVersion}</Badge>
                </div>
                {apiVersion && (
                  <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                    <span className="text-muted-foreground">API Version</span>
                    <span className="font-medium">v{apiVersion}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Device information not available
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-magenta-500" />
              System Status
            </CardTitle>
            <CardDescription>
              Current system state and uptime
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex justify-between p-3 rounded-xl bg-muted/30">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : time ? (
              <div className="space-y-3">
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="success" className="flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Online
                  </Badge>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">Uptime</span>
                  <span className="font-medium">{formatUptime(time.upTime)}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">Timezone</span>
                  <span className="font-medium">UTC{time.localTimeZone}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">Local Time</span>
                  <span className="font-medium">
                    {new Date(time.localTime * 1000).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                System status not available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="glass-card border-0 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Power className="h-5 w-5 text-magenta-500" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              System maintenance and controls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" onClick={() => mutate()} className="glass h-12 px-6">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Data
              </Button>

              {!showConfirm ? (
                <Button
                  variant="destructive"
                  onClick={() => setShowConfirm(true)}
                  className="h-12 px-6"
                >
                  <Power className="mr-2 h-4 w-4" />
                  Reboot Gateway
                </Button>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-xl border border-destructive/20">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                  <span className="text-sm">Are you sure you want to reboot?</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleReboot}
                    disabled={rebooting}
                  >
                    {rebooting ? "Rebooting..." : "Yes, Reboot"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {rebooting && (
              <div className="mt-6 p-4 bg-muted/30 rounded-xl border border-border/50">
                <p className="text-sm text-muted-foreground">
                  Gateway is rebooting. This page will be unavailable for approximately 2-3 minutes.
                  Please wait and then refresh the page.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
