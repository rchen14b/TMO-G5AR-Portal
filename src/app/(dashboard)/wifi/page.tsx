"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshControl } from "@/components/refresh-control"
import { useApConfig } from "@/hooks/use-router-data"
import { Wifi, Eye, EyeOff, Save, Radio, Shield, Antenna, AlertCircle } from "lucide-react"

interface LocalConfig {
  "2.4ghz": { isRadioEnabled: boolean }
  "5.0ghz": { isRadioEnabled: boolean }
  "6.0ghz"?: { isRadioEnabled: boolean }
  ssids: {
    "2.4ghzSsid": boolean
    "5.0ghzSsid": boolean
    "6.0ghzSsid"?: boolean
    encryptionMode: string
    encryptionVersion: string
    guest: boolean
    isBroadcastEnabled: boolean
    ssidName: string
    wpaKey: string
  }[]
}

export default function WifiPage() {
  const { data, isLoading, mutate } = useApConfig()
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localConfig, setLocalConfig] = useState<LocalConfig | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Sync local config with fetched data
  useEffect(() => {
    if (data && !localConfig) {
      setLocalConfig(data as LocalConfig)
    }
  }, [data, localConfig])

  // Reset local config when data changes (after save or refresh)
  useEffect(() => {
    if (data) {
      setLocalConfig(data as LocalConfig)
      setHasChanges(false)
    }
  }, [data])

  const ssid = localConfig?.ssids?.[0]

  const handleRefresh = useCallback(() => {
    setLocalConfig(null)
    setHasChanges(false)
    mutate()
  }, [mutate])

  // Count enabled bands for SSID
  const countEnabledSsidBands = () => {
    if (!ssid) return 0
    let count = 0
    if (ssid["2.4ghzSsid"]) count++
    if (ssid["5.0ghzSsid"]) count++
    if (ssid["6.0ghzSsid"]) count++
    return count
  }

  // Toggle SSID band with validation (at least one must be enabled)
  const toggleSsidBand = (band: "2.4ghzSsid" | "5.0ghzSsid" | "6.0ghzSsid") => {
    if (!localConfig || !ssid) return

    const currentValue = ssid[band]
    // If trying to disable and this is the last enabled band, don't allow
    if (currentValue && countEnabledSsidBands() <= 1) {
      return
    }

    const updatedSsids = [...localConfig.ssids]
    updatedSsids[0] = {
      ...updatedSsids[0],
      [band]: !currentValue,
    }

    setLocalConfig({
      ...localConfig,
      ssids: updatedSsids,
    })
    setHasChanges(true)
  }

  // Toggle radio band
  const toggleRadioBand = (band: "2.4ghz" | "5.0ghz" | "6.0ghz") => {
    if (!localConfig) return

    const currentValue = localConfig[band]?.isRadioEnabled

    setLocalConfig({
      ...localConfig,
      [band]: {
        ...localConfig[band],
        isRadioEnabled: !currentValue,
      },
    })
    setHasChanges(true)
  }

  // Toggle broadcast SSID
  const toggleBroadcast = () => {
    if (!localConfig || !ssid) return

    const updatedSsids = [...localConfig.ssids]
    updatedSsids[0] = {
      ...updatedSsids[0],
      isBroadcastEnabled: !ssid.isBroadcastEnabled,
    }

    setLocalConfig({
      ...localConfig,
      ssids: updatedSsids,
    })
    setHasChanges(true)
  }

  // Update SSID name
  const updateSsidName = (name: string) => {
    if (!localConfig || !ssid) return

    const updatedSsids = [...localConfig.ssids]
    updatedSsids[0] = {
      ...updatedSsids[0],
      ssidName: name,
    }

    setLocalConfig({
      ...localConfig,
      ssids: updatedSsids,
    })
    setHasChanges(true)
  }

  // Update password
  const updatePassword = (password: string) => {
    if (!localConfig || !ssid) return

    const updatedSsids = [...localConfig.ssids]
    updatedSsids[0] = {
      ...updatedSsids[0],
      wpaKey: password,
    }

    setLocalConfig({
      ...localConfig,
      ssids: updatedSsids,
    })
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!localConfig || !hasChanges) return

    setSaving(true)
    try {
      const response = await fetch("/api/router/ap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localConfig),
      })

      if (response.ok) {
        setHasChanges(false)
        // Wait a bit for the gateway to apply changes
        await new Promise((resolve) => setTimeout(resolve, 2000))
        mutate()
      } else {
        console.error("Failed to save WiFi config")
      }
    } catch (error) {
      console.error("Error saving WiFi config:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WiFi Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your wireless network configuration
          </p>
        </div>
        <div className="flex gap-3">
          <RefreshControl onRefresh={handleRefresh} isLoading={isLoading} />
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="gradient-bg border-0 text-white h-9"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-amber-600 dark:text-amber-400">
            You have unsaved changes. Click Save to apply them.
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Radio Status */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-magenta-500" />
              Radio Status
            </CardTitle>
            <CardDescription>
              Enable or disable WiFi frequency bands
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-11" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Antenna className="h-4 w-4 text-orange-500" />
                      <Label className="font-medium">2.4 GHz</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Better range, slower speeds
                    </p>
                  </div>
                  <Switch
                    checked={localConfig?.["2.4ghz"]?.isRadioEnabled ?? false}
                    onCheckedChange={() => toggleRadioBand("2.4ghz")}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Antenna className="h-4 w-4 text-blue-500" />
                      <Label className="font-medium">5 GHz</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Faster speeds, shorter range
                    </p>
                  </div>
                  <Switch
                    checked={localConfig?.["5.0ghz"]?.isRadioEnabled ?? false}
                    onCheckedChange={() => toggleRadioBand("5.0ghz")}
                  />
                </div>
                {localConfig?.["6.0ghz"] && (
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Antenna className="h-4 w-4 text-purple-500" />
                        <Label className="font-medium">6 GHz</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Ultra fast, limited range
                      </p>
                    </div>
                    <Switch
                      checked={localConfig?.["6.0ghz"]?.isRadioEnabled ?? false}
                      onCheckedChange={() => toggleRadioBand("6.0ghz")}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Network Configuration */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-magenta-500" />
              Network Configuration
            </CardTitle>
            <CardDescription>
              Configure your WiFi network name and password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : ssid ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ssid">Network Name (SSID)</Label>
                  <Input
                    id="ssid"
                    value={ssid.ssidName}
                    onChange={(e) => updateSsidName(e.target.value)}
                    placeholder="Enter network name"
                    className="h-12 rounded-xl bg-muted/30 border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={ssid.wpaKey}
                      onChange={(e) => updatePassword(e.target.value)}
                      placeholder="Enter password"
                      className="h-12 rounded-xl bg-muted/30 border-border/50 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div className="space-y-0.5">
                    <Label>Broadcast SSID</Label>
                    <p className="text-sm text-muted-foreground">
                      Make network visible to devices
                    </p>
                  </div>
                  <Switch
                    checked={ssid.isBroadcastEnabled}
                    onCheckedChange={toggleBroadcast}
                  />
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No network configuration found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-magenta-500" />
              Security Settings
            </CardTitle>
            <CardDescription>
              View your network security configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex justify-between p-3 rounded-xl bg-muted/30">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : ssid ? (
              <div className="space-y-3">
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">Encryption</span>
                  <Badge variant="magenta">{ssid.encryptionVersion}</Badge>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">Encryption Mode</span>
                  <span className="font-medium">{ssid.encryptionMode}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">Guest Network</span>
                  <Badge variant={ssid.guest ? "success" : "secondary"}>
                    {ssid.guest ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Band Configuration */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Antenna className="h-5 w-5 text-magenta-500" />
              Band Configuration
            </CardTitle>
            <CardDescription>
              Configure which bands your SSID broadcasts on (at least one required)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-11" />
                  </div>
                ))}
              </div>
            ) : ssid ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Antenna className="h-4 w-4 text-orange-500" />
                    <Label>2.4 GHz SSID</Label>
                  </div>
                  <Switch
                    checked={ssid["2.4ghzSsid"]}
                    onCheckedChange={() => toggleSsidBand("2.4ghzSsid")}
                    disabled={ssid["2.4ghzSsid"] && countEnabledSsidBands() <= 1}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Antenna className="h-4 w-4 text-blue-500" />
                    <Label>5 GHz SSID</Label>
                  </div>
                  <Switch
                    checked={ssid["5.0ghzSsid"]}
                    onCheckedChange={() => toggleSsidBand("5.0ghzSsid")}
                    disabled={ssid["5.0ghzSsid"] && countEnabledSsidBands() <= 1}
                  />
                </div>
                {ssid["6.0ghzSsid"] !== undefined && (
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Antenna className="h-4 w-4 text-purple-500" />
                      <Label>6 GHz SSID</Label>
                    </div>
                    <Switch
                      checked={ssid["6.0ghzSsid"]}
                      onCheckedChange={() => toggleSsidBand("6.0ghzSsid")}
                      disabled={ssid["6.0ghzSsid"] && countEnabledSsidBands() <= 1}
                    />
                  </div>
                )}
                {countEnabledSsidBands() <= 1 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    At least one band must remain enabled for the SSID to broadcast.
                  </p>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
