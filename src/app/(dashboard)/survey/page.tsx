"use client"

import { useMemo, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SignalSparkline } from "@/components/signal-sparkline"
import {
  useSurvey,
  useGatewayHealth,
  useSignalInfo,
  useSpeedTests,
  type SignalSample,
  type SpeedTestResult,
} from "@/hooks/use-router-data"
import { cn, getSignalQuality, getSinrQuality } from "@/lib/utils"
import { MapPin, Square, Play, Download, Trash2, Gauge, AlertTriangle, Loader2 } from "lucide-react"

// Samples in the first minutes after the gateway comes back up are noisy while
// it reattaches and picks a cell, so the comparison skips them by default.
const SETTLE_MS = 2 * 60 * 1000

// Above this SINR the link already runs near its best modulation, so RSRP
// (which limits upload) becomes the better tie-breaker between spots.
const SINR_TARGET = 15

interface LocationSummary {
  location: string
  samples: number
  sinrAvg: number
  sinrMin: number
  sinrSd: number
  rsrpAvg: number
  rsrpMin: number
  rsrqAvg: number
  bands: string[]
  towers: string[]
  durationMs: number
  onHomeCell: boolean
  tests: number
  downMbps: number | null
  upMbps: number | null
  loadedMs: number | null
}

const avg = (v: number[]) => Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10

function median(v: number[]): number | null {
  if (v.length === 0) return null
  const s = [...v].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 10) / 10
}

function stdDev(v: number[]): number {
  const mean = v.reduce((a, b) => a + b, 0) / v.length
  const variance = v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length
  return Math.round(Math.sqrt(variance) * 10) / 10
}

const cellKey = (gnbid: number, cid: number) => `${gnbid}/${cid}`

// The cell most survey samples were on. Spots that leave it are flagged,
// since a different tower or band usually means a worse, less stable link.
function homeCell(entries: SignalSample[]): string | null {
  const counts = new Map<string, number>()
  for (const e of entries) {
    const k = cellKey(e.gnbid, e.cid)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  let best: string | null = null
  let n = 0
  counts.forEach((c, k) => {
    if (c > n) {
      best = k
      n = c
    }
  })
  return best
}

// First recorded sample of each visit, so settling is measured from when the
// gateway was actually reachable rather than from when the label was set.
function visitStarts(entries: SignalSample[]): Map<number, number> {
  const starts = new Map<number, number>()
  for (const e of entries) {
    const v = e.visit ?? 0
    if (!starts.has(v)) starts.set(v, e.t)
  }
  return starts
}

function summarize(
  entries: SignalSample[],
  tests: SpeedTestResult[],
  skipSettle: boolean,
  home: string | null
): LocationSummary[] {
  const starts = visitStarts(entries)
  const byLoc = new Map<string, SignalSample[]>()
  for (const e of entries) {
    if (!e.loc) continue
    if (skipSettle && e.t - (starts.get(e.visit ?? 0) ?? e.t) < SETTLE_MS) continue
    const list = byLoc.get(e.loc) ?? []
    list.push(e)
    byLoc.set(e.loc, list)
  }

  const out: LocationSummary[] = []
  byLoc.forEach((list, location) => {
    const visits = new Map<number, { first: number; last: number }>()
    for (const e of list) {
      const v = visits.get(e.visit ?? 0)
      if (v) v.last = e.t
      else visits.set(e.visit ?? 0, { first: e.t, last: e.t })
    }
    let durationMs = 0
    visits.forEach((v) => (durationMs += v.last - v.first))

    const towers = Array.from(new Set(list.map((e) => cellKey(e.gnbid, e.cid))))
    const locTests = tests.filter((r) => r.loc === location)

    out.push({
      location,
      samples: list.length,
      sinrAvg: avg(list.map((e) => e.sinr)),
      sinrMin: Math.min(...list.map((e) => e.sinr)),
      sinrSd: stdDev(list.map((e) => e.sinr)),
      rsrpAvg: avg(list.map((e) => e.rsrp)),
      rsrpMin: Math.min(...list.map((e) => e.rsrp)),
      rsrqAvg: avg(list.map((e) => e.rsrq)),
      bands: Array.from(new Set(list.flatMap((e) => e.bands))),
      towers,
      durationMs,
      onHomeCell: home !== null && towers.length === 1 && towers[0] === home,
      tests: locTests.length,
      downMbps: median(locTests.map((r) => r.downMbps)),
      upMbps: median(locTests.map((r) => r.upMbps)),
      loadedMs: median(locTests.map((r) => r.loadedP90Ms)),
    })
  })

  return out.sort(compareSpots)
}

// Above the target, RSRP leads (upload) and SINR counts at half weight, capped
// where the link tops out, so a 1 dB RSRP edge cannot outrank a 4 dB SINR lead.
const placementScore = (s: LocationSummary) => s.rsrpAvg + 0.5 * Math.min(s.sinrAvg, 25)

// Ranking: stay on the home cell, then reach the SINR target, then the
// placement score. Below the target, SINR itself decides.
function compareSpots(a: LocationSummary, b: LocationSummary): number {
  if (a.onHomeCell !== b.onHomeCell) return a.onHomeCell ? -1 : 1
  const aOk = a.sinrAvg >= SINR_TARGET
  const bOk = b.sinrAvg >= SINR_TARGET
  if (aOk !== bOk) return aOk ? -1 : 1
  if (aOk) return placementScore(b) - placementScore(a)
  return b.sinrAvg - a.sinrAvg
}

function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

const formatTime = (t: number) =>
  new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

function signed(n: number): string {
  const r = Math.round(n * 10) / 10
  return r > 0 ? `+${r}` : `${r}`
}

function exportCsv(entries: SignalSample[]) {
  const header = "time,location,rsrp,rsrq,sinr,rssi,bands,gnbid,cid"
  const rows = entries.map((e) =>
    [
      new Date(e.t).toISOString(),
      JSON.stringify(e.loc ?? ""),
      e.rsrp,
      e.rsrq,
      e.sinr,
      e.rssi,
      e.bands.join(" "),
      e.gnbid,
      e.cid,
    ].join(",")
  )
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `placement-survey-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function SpeedFigures({ r }: { r: SpeedTestResult }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      <span>
        <span className="text-muted-foreground">Down </span>
        <span className="font-semibold">{r.downMbps} Mbps</span>
      </span>
      <span>
        <span className="text-muted-foreground">Up </span>
        <span className="font-semibold">{r.upMbps} Mbps</span>
      </span>
      <span>
        <span className="text-muted-foreground">Latency idle </span>
        <span className="font-semibold">{r.idleMs} ms</span>
      </span>
      <span>
        <span className="text-muted-foreground">Under load (p90) </span>
        <span className="font-semibold">{r.loadedP90Ms} ms</span>
      </span>
    </div>
  )
}

export default function SurveyPage() {
  const { data, mutate } = useSurvey()
  const { data: health } = useGatewayHealth()
  const { data: live } = useSignalInfo()
  const { data: speed, mutate: mutateSpeed } = useSpeedTests()
  const [name, setName] = useState("")
  const [skipSettle, setSkipSettle] = useState(true)
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)

  const entries = useMemo(() => data?.entries ?? [], [data])
  const tests = useMemo(() => speed?.results ?? [], [speed])
  const active = data?.active ?? null
  const home = useMemo(() => homeCell(entries), [entries])
  const summaries = useMemo(
    () => summarize(entries, tests, skipSettle, home),
    [entries, tests, skipSettle, home]
  )
  const knownLocations = useMemo(
    () => Array.from(new Set(entries.map((e) => e.loc).filter(Boolean))) as string[],
    [entries]
  )

  const visitSamples = active ? entries.filter((e) => e.visit === active.since) : []
  const latest = visitSamples[visitSamples.length - 1]
  const settleLeft = visitSamples.length
    ? SETTLE_MS - (latest.t - visitSamples[0].t)
    : SETTLE_MS
  const online = health?.status === "online"

  const now5g = live?.signal?.["5g"]
  const liveCell = now5g ? cellKey(now5g.gNBID, now5g.cid) : null
  const offHome = home !== null && liveCell !== null && liveCell !== home
  const bestOther = summaries.find((s) => s.location !== active?.location)
  const visitTests = active ? tests.filter((r) => r.visit === active.since) : []
  const lastTest = visitTests[visitTests.length - 1] ?? (active ? undefined : tests[tests.length - 1])
  const running = testing || speed?.running === true

  const setLocation = async (location: string | null) => {
    setBusy(true)
    try {
      await fetch("/api/router/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location }),
      })
      setName("")
      await mutate()
    } finally {
      setBusy(false)
    }
  }

  const removeLocation = async (location: string) => {
    if (!window.confirm(`Delete all survey samples and speed tests for "${location}"?`)) return
    await fetch(`/api/router/survey?location=${encodeURIComponent(location)}`, {
      method: "DELETE",
    })
    await Promise.all([mutate(), mutateSpeed()])
  }

  const runSpeedTest = async () => {
    setTesting(true)
    setTestError(null)
    try {
      const res = await fetch("/api/router/speedtest", { method: "POST" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setTestError(body.error ?? `Speed test failed (HTTP ${res.status})`)
      }
      await mutateSpeed()
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" />
          Placement Survey
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Name the spot, start recording, then move the gateway there. Samples are
          taken every 10 seconds and tagged with the location so spots can be
          compared side by side.
        </p>
      </div>

      {/* Live signal, for nudging the gateway within a spot */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Live signal</CardTitle>
          <CardDescription className="text-xs">
            Updates every 3 seconds. Turn or shift the gateway a little, wait for
            the numbers to settle, and keep the position with the best SINR on the
            usual cell.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {now5g ? (
            <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
              <div>
                <div className="text-xs text-muted-foreground">SINR</div>
                <div className={cn("text-4xl font-bold tabular-nums", getSinrQuality(now5g.sinr).color)}>
                  {now5g.sinr}
                  <span className="text-base font-normal text-muted-foreground"> dB</span>
                </div>
                <div className="text-xs text-muted-foreground">{getSinrQuality(now5g.sinr).label}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">RSRP</div>
                <div className={cn("text-4xl font-bold tabular-nums", getSignalQuality(now5g.rsrp).color)}>
                  {now5g.rsrp}
                  <span className="text-base font-normal text-muted-foreground"> dBm</span>
                </div>
                <div className="text-xs text-muted-foreground">{getSignalQuality(now5g.rsrp).label}</div>
              </div>
              {visitSamples.length > 1 && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">This visit (SINR, RSRP)</div>
                  <SignalSparkline data={visitSamples.slice(-30).map((e) => e.sinr)} color="green" height={24} width={140} />
                  <SignalSparkline data={visitSamples.slice(-30).map((e) => e.rsrp)} color="magenta" height={24} width={140} />
                </div>
              )}
              <div className="space-y-1 text-sm">
                <div className="text-muted-foreground">
                  {now5g.bands.join(", ")} · cell {liveCell}
                </div>
                {offHome && (
                  <Badge variant="warning" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Not on the usual cell ({home})
                  </Badge>
                )}
                {bestOther && (
                  <div>
                    <span className="text-muted-foreground">vs {bestOther.location}: </span>
                    <span className="font-semibold">
                      SINR {signed(now5g.sinr - bestOther.sinrAvg)}, RSRP{" "}
                      {signed(now5g.rsrp - bestOther.rsrpAvg)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Waiting for the gateway…</p>
          )}
        </CardContent>
      </Card>

      {/* Current location */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Current location</CardTitle>
          <CardDescription className="text-xs">
            After moving, the gateway takes 2–3 minutes to reconnect. Leave it at
            least 5 minutes per spot for a fair reading, and run a speed test once
            it has settled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {active ? (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div>
                <div className="text-2xl font-bold">{active.location}</div>
                <div className="text-xs text-muted-foreground">
                  Started {formatTime(active.since)} · {visitSamples.length} sample
                  {visitSamples.length === 1 ? "" : "s"}
                </div>
              </div>
              <Badge variant={online ? "success" : "destructive"}>
                {online ? "Gateway online" : "Gateway offline"}
              </Badge>
              {online && visitSamples.length > 0 && (
                <Badge variant="outline">
                  {settleLeft > 0
                    ? `Settling, ${formatDuration(settleLeft)} left`
                    : "Settled"}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                disabled={busy}
                onClick={() => setLocation(null)}
              >
                <Square className="h-4 w-4 mr-2" />
                Stop recording
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Not recording a location. Samples are taken once a minute as usual.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 rounded-md border p-3">
            <Button size="sm" disabled={running || !online} onClick={runSpeedTest}>
              {running ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Gauge className="h-4 w-4 mr-2" />
              )}
              {running ? "Testing, about 20 seconds" : "Run speed test"}
            </Button>
            {testError ? (
              <span className="text-sm text-destructive">{testError}</span>
            ) : lastTest ? (
              <SpeedFigures r={lastTest} />
            ) : (
              <span className="text-sm text-muted-foreground">
                {active
                  ? "No speed test at this spot yet."
                  : "Tests run from the portal's host. Keep it wired to the gateway."}
              </span>
            )}
          </div>

          <form
            className="flex gap-2 max-w-md"
            onSubmit={(e) => {
              e.preventDefault()
              if (name.trim()) setLocation(name.trim())
            }}
          >
            <Input
              placeholder={active ? "Next spot, e.g. Upstairs window" : "Spot name, e.g. Office shelf"}
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
            />
            <Button type="submit" disabled={busy || !name.trim()}>
              <Play className="h-4 w-4 mr-2" />
              Start recording here
            </Button>
          </form>

          {knownLocations.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Return to:</span>
              {knownLocations.map((loc) => (
                <Button
                  key={loc}
                  variant="secondary"
                  size="sm"
                  disabled={busy || active?.location === loc}
                  onClick={() => setLocation(loc)}
                >
                  {loc}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Locations compared</CardTitle>
              <CardDescription className="text-xs max-w-2xl">
                Ranked by: stays on the usual cell ({home ?? "none yet"}), then SINR
                of {SINR_TARGET} dB or more, then RSRP (which sets upload speed)
                with SINR as a tie-breaker. A low SINR spread means a steadier spot. Speeds are
                medians of the tests run there; compare spots tested close
                together, since tower load changes through the day.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={skipSettle}
                  onChange={(e) => setSkipSettle(e.target.checked)}
                />
                Skip first 2 min of each visit
              </label>
              <Button
                variant="outline"
                size="sm"
                disabled={entries.length === 0}
                onClick={() => exportCsv(entries)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {summaries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {entries.length === 0
                ? "No survey samples yet. Start recording a location above."
                : "No settled samples yet. The first 2 minutes of each visit are skipped."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">SINR avg</TableHead>
                  <TableHead className="text-right">SINR min</TableHead>
                  <TableHead className="text-right">SINR spread</TableHead>
                  <TableHead className="text-right">RSRP avg</TableHead>
                  <TableHead className="text-right">RSRP min</TableHead>
                  <TableHead className="text-right">Down</TableHead>
                  <TableHead className="text-right">Up</TableHead>
                  <TableHead className="text-right">Loaded p90</TableHead>
                  <TableHead>Band</TableHead>
                  <TableHead>Cell</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((s, i) => (
                  <TableRow key={s.location}>
                    <TableCell className="font-medium">
                      {s.location}
                      {i === 0 && summaries.length > 1 && (
                        <Badge className="ml-2" variant="secondary">
                          Best
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className={cn("text-right font-semibold", getSinrQuality(s.sinrAvg).color)}>
                      {s.sinrAvg}
                    </TableCell>
                    <TableCell className="text-right">{s.sinrMin}</TableCell>
                    <TableCell className="text-right">±{s.sinrSd}</TableCell>
                    <TableCell className={cn("text-right", getSignalQuality(s.rsrpAvg).color)}>
                      {s.rsrpAvg}
                    </TableCell>
                    <TableCell className="text-right">{s.rsrpMin}</TableCell>
                    <TableCell className="text-right">{s.downMbps ?? "–"}</TableCell>
                    <TableCell className="text-right">{s.upMbps ?? "–"}</TableCell>
                    <TableCell className="text-right">
                      {s.loadedMs !== null ? `${s.loadedMs} ms` : "–"}
                    </TableCell>
                    <TableCell>{s.bands.join(", ")}</TableCell>
                    <TableCell className="text-xs">
                      <span className={cn(!s.onHomeCell && "text-yellow-600 dark:text-yellow-500")}>
                        {s.towers.join(", ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{formatDuration(s.durationMs)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={`Delete ${s.location}`}
                        onClick={() => removeLocation(s.location)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Speed test log */}
      {tests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Speed tests</CardTitle>
            <CardDescription className="text-xs">
              Newest first. Latency is measured to 1.1.1.1 while the line is idle
              and while it is saturated; a large gap means the connection queues
              traffic under load.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Down</TableHead>
                  <TableHead className="text-right">Up</TableHead>
                  <TableHead className="text-right">Idle</TableHead>
                  <TableHead className="text-right">Loaded down</TableHead>
                  <TableHead className="text-right">Loaded up</TableHead>
                  <TableHead className="text-right">Lost probes</TableHead>
                  <TableHead>Signal at test</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...tests].reverse().slice(0, 25).map((r) => (
                  <TableRow key={r.t}>
                    <TableCell>{formatTime(r.t)}</TableCell>
                    <TableCell>{r.loc ?? <span className="text-muted-foreground">none</span>}</TableCell>
                    <TableCell className="text-right font-semibold">{r.downMbps} Mbps</TableCell>
                    <TableCell className="text-right font-semibold">{r.upMbps} Mbps</TableCell>
                    <TableCell className="text-right">{r.idleMs} ms</TableCell>
                    <TableCell className="text-right">{r.loadedDownMs} ms</TableCell>
                    <TableCell className="text-right">{r.loadedUpMs} ms</TableCell>
                    <TableCell className="text-right">{r.probeLoss}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.signal
                        ? `RSRP ${r.signal.rsrp} · SINR ${r.signal.sinr} · ${r.signal.bands.join(", ")} · ${cellKey(r.signal.gnbid, r.signal.cid)}`
                        : "–"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
