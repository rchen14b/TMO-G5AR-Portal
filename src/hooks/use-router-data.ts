"use client"

import useSWR from "swr"

const fetcher = (url: string) =>
  fetch(url, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  }).then((res) => res.json())

export interface GatewayHealthStatus {
  status: "online" | "offline" | "error"
  ip: string
  message?: string
}

export function useGatewayHealth() {
  return useSWR<GatewayHealthStatus>("/api/router/health", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  })
}

export function useGatewayInfo() {
  return useSWR("/api/router/gateway", fetcher, {
    refreshInterval: 5000,
    keepPreviousData: true,
  })
}

export function useSignalInfo() {
  return useSWR("/api/router/signal", fetcher, {
    refreshInterval: 3000,
    keepPreviousData: true,
  })
}

export function useCellInfo() {
  return useSWR("/api/router/cell", fetcher, {
    refreshInterval: 5000,
    keepPreviousData: true,
  })
}

export function useClients() {
  return useSWR("/api/router/clients", fetcher, {
    refreshInterval: 10000,
    keepPreviousData: true,
  })
}

export function useSimInfo() {
  return useSWR("/api/router/sim", fetcher, {
    refreshInterval: 30000,
    keepPreviousData: true,
  })
}

export function useApConfig() {
  return useSWR("/api/router/ap", fetcher, {
    refreshInterval: 30000,
  })
}

export interface VersionInfo {
  version: number
}

export function useVersion() {
  return useSWR<VersionInfo>("/api/router/version", fetcher, {
    refreshInterval: 60000, // Check every minute
  })
}

export interface TelemetryAll {
  cell: {
    "5g": {
      cqi: number
      ecgi: string
      sector: {
        antennaUsed: string
        bands: string[]
        bars: number
        cid: number
        gNBID: number
        rsrp: number
        rsrq: number
        rssi: number
        sinr: number
      }
    }
    generic: {
      apn: string
      hasIPv6: boolean
      registration: string
    }
    gps: {
      latitude: number
      longitude: number
    }
  }
  clients: {
    "2.4ghz": Array<{
      connected: boolean
      ipv4: string
      ipv6: string[]
      mac: string
      name: string
      signal?: number
    }>
    "5.0ghz": Array<{
      connected: boolean
      ipv4: string
      ipv6: string[]
      mac: string
      name: string
      signal?: number
    }>
    ethernet: Array<{
      connected: boolean
      ipv4: string
      ipv6: string[]
      mac: string
      name: string
    }>
    wifi: Array<{
      connected: boolean
      ipv4: string
      ipv6: string[]
      mac: string
      name: string
      signal?: number
    }>
  }
  sim: {
    iccId: string
    imei: string
    imsi: string
    msisdn: string
    status: boolean
  }
}

// Combined telemetry hook - fetches cell, clients, and sim in one call
export function useTelemetryAll() {
  return useSWR<TelemetryAll>("/api/router/telemetry", fetcher, {
    refreshInterval: 5000,
  })
}
