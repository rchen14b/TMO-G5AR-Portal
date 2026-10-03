"use client"

import { useState, useEffect } from "react"
import { Cable, Wifi, Check, Plus, Trash2 } from "lucide-react"
import { Client } from "@/lib/router-api"
import { Sheet } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { useDeviceNames, useDeviceSchedule } from "@/hooks/use-router-data"
import { cn } from "@/lib/utils"
import { mutate } from "swr"

export type ClientWithType = Client & { type: string }

interface Timeline {
  daysOfWeek: string[]
  startTime: string
  endTime: string
}

const DAYS = [
  { key: "monday", label: "Mo" },
  { key: "tuesday", label: "Tu" },
  { key: "wednesday", label: "We" },
  { key: "thursday", label: "Th" },
  { key: "friday", label: "Fr" },
  { key: "saturday", label: "Sa" },
  { key: "sunday", label: "Su" },
]

interface DeviceSheetProps {
  client: ClientWithType | null
  onClose: () => void
}

export function DeviceSheet({ client, onClose }: DeviceSheetProps) {
  const [customName, setCustomName] = useState("")
  const [nameSaving, setNameSaving] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  const [ban, setBan] = useState(false)
  const [banSaving, setBanSaving] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [timelines, setTimelines] = useState<Timeline[]>([])
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [loadedForMac, setLoadedForMac] = useState<string | null>(null)

  const { data: deviceNames, mutate: mutateNames } = useDeviceNames()
  const { data: scheduleData } = useDeviceSchedule(client?.mac ?? null)

  const scheduleLoaded = loadedForMac === client?.mac

  useEffect(() => {
    if (!client) return
    setLoadedForMac(null)
    setBan(false)
    setIsEnabled(false)
    setTimelines([])
    setCustomName("")
    setNameSaved(false)
  }, [client])

  useEffect(() => {
    if (deviceNames !== undefined && client) {
      setCustomName(deviceNames[client.mac] ?? "")
    }
  }, [deviceNames, client])

  useEffect(() => {
    setNameSaved(false)
  }, [customName])

  useEffect(() => {
    if (scheduleData && client && loadedForMac !== client.mac) {
      setBan(scheduleData.ban)
      setIsEnabled(scheduleData.isEnabled)
      setTimelines(scheduleData.timelines ?? [])
      setLoadedForMac(client.mac)
    }
  }, [scheduleData, client, loadedForMac])

  async function saveName() {
    if (!client) return
    setNameSaving(true)
    try {
      await fetch("/api/device-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mac: client.mac, name: customName }),
      })
      await mutateNames()
      mutate("/api/router/clients")
      setNameSaved(true)
    } finally {
      setNameSaving(false)
    }
  }

  async function saveBanToggle(newBan: boolean) {
    if (!client || !scheduleLoaded || banSaving) return
    setBan(newBan)
    setBanSaving(true)
    try {
      await fetch("/api/router/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mac: client.mac, ban: newBan, isEnabled, timelines }),
      })
    } finally {
      setBanSaving(false)
    }
  }

  async function saveSchedule() {
    if (!client) return
    setScheduleSaving(true)
    try {
      await fetch("/api/router/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mac: client.mac, ban, isEnabled, timelines }),
      })
    } finally {
      setScheduleSaving(false)
    }
  }

  function addTimeline() {
    setTimelines([...timelines, { daysOfWeek: [], startTime: "00:00", endTime: "23:59" }])
  }

  function removeTimeline(index: number) {
    setTimelines(timelines.filter((_, i) => i !== index))
  }

  function updateTimeline(index: number, changes: Partial<Timeline>) {
    setTimelines(timelines.map((t, i) => (i === index ? { ...t, ...changes } : t)))
  }

  function toggleDay(timelineIndex: number, day: string) {
    const t = timelines[timelineIndex]
    const days = t.daysOfWeek.includes(day)
      ? t.daysOfWeek.filter((d) => d !== day)
      : [...t.daysOfWeek, day]
    updateTimeline(timelineIndex, { daysOfWeek: days })
  }

  const getConnectionBadge = (type: string) => {
    switch (type) {
      case "ethernet":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            Ethernet
          </Badge>
        )
      case "2.4ghz":
        return (
          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
            2.4 GHz
          </Badge>
        )
      case "5.0ghz":
        return <Badge variant="magenta">5 GHz</Badge>
      default:
        return <Badge variant="secondary">WiFi</Badge>
    }
  }

  return (
    <Sheet open={client !== null} onClose={onClose} title="Device Settings">
      {client && (
        <div className="space-y-6">
          {/* Device info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 shrink-0">
                {client.type === "ethernet" ? (
                  <Cable className="h-5 w-5" />
                ) : (
                  <Wifi className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-base truncate">
                  {client.name || "Unknown Device"}
                </p>
                <p className="text-sm text-muted-foreground font-mono">{client.mac}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <code className="bg-muted/50 px-2 py-1 rounded-lg text-sm">{client.ipv4}</code>
              {getConnectionBadge(client.type)}
              <Badge variant={client.connected ? "success" : "secondary"}>
                {client.connected ? "Online" : "Offline"}
              </Badge>
            </div>
          </div>

          <hr className="border-border/50" />

          {/* Custom name */}
          <div className="space-y-3">
            <div>
              <Label className="text-base font-medium">Custom Name</Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                Override the device hostname with a friendly name
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={client.name || "Enter a name"}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName()
                }}
              />
              <Button
                onClick={saveName}
                disabled={nameSaving}
                variant="outline"
                size="sm"
                className="shrink-0 w-16"
              >
                {nameSaved ? <Check className="h-4 w-4 text-green-500" /> : "Save"}
              </Button>
            </div>
          </div>

          <hr className="border-border/50" />

          {/* Block access + schedule */}
          {!scheduleLoaded ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full shrink-0" />
              </div>
            </div>
          ) : (
            <>
              {/* Ban toggle */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label className="text-base font-medium">Block Internet Access</Label>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Immediately blocks all internet access for this device
                  </p>
                </div>
                <Switch
                  checked={ban}
                  onCheckedChange={(v) => {
                    if (!banSaving) saveBanToggle(v as boolean)
                  }}
                />
              </div>

              {!ban && (
                <>
                  <hr className="border-border/50" />

                  {/* Schedule */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Label className="text-base font-medium">Access Schedule</Label>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Restrict when this device can access the internet
                        </p>
                      </div>
                      <Switch checked={isEnabled} onCheckedChange={(v) => setIsEnabled(v as boolean)} />
                    </div>

                    {isEnabled && (
                      <div className="space-y-3">
                        {timelines.map((timeline, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-border/50 p-4 space-y-3 bg-muted/20"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-muted-foreground">
                                Window {idx + 1}
                              </span>
                              <button
                                onClick={() => removeTimeline(idx)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {DAYS.map(({ key, label }) => (
                                <button
                                  key={key}
                                  onClick={() => toggleDay(idx, key)}
                                  className={cn(
                                    "h-8 w-9 rounded-lg text-xs font-medium transition-colors",
                                    timeline.daysOfWeek.includes(key)
                                      ? "bg-magenta-500 text-white"
                                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                  )}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground shrink-0">From</span>
                              <input
                                type="time"
                                value={timeline.startTime}
                                onChange={(e) =>
                                  updateTimeline(idx, { startTime: e.target.value })
                                }
                                className="bg-muted/50 rounded-lg px-2 py-1 text-sm border-0 outline-none focus:ring-1 focus:ring-ring flex-1 min-w-0"
                              />
                              <span className="text-muted-foreground shrink-0">to</span>
                              <input
                                type="time"
                                value={timeline.endTime}
                                onChange={(e) =>
                                  updateTimeline(idx, { endTime: e.target.value })
                                }
                                className="bg-muted/50 rounded-lg px-2 py-1 text-sm border-0 outline-none focus:ring-1 focus:ring-ring flex-1 min-w-0"
                              />
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={addTimeline}
                          className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 p-3 text-sm text-muted-foreground hover:border-border hover:text-foreground transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Add time window
                        </button>
                      </div>
                    )}

                    <Button
                      onClick={saveSchedule}
                      disabled={scheduleSaving}
                      className="w-full"
                    >
                      {scheduleSaving ? "Saving..." : "Save Schedule"}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </Sheet>
  )
}
