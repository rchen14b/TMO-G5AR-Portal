// Server-side speed test against Cloudflare's speed endpoints, run from the
// machine hosting the portal. Measures download and upload with parallel
// streams, plus latency idle and under load, and stores each result with the
// signal at the time and the active survey location so placements can be
// compared on throughput, not just RSRP/SINR.
//
// Results go to <SIGNAL_DATA_DIR>/speed-tests.jsonl (one JSON result per line).
// The numbers describe the path from this host: run the portal on a machine
// wired to the gateway, or Wi-Fi will cap the result.
import { promises as fs } from "fs"
import path from "path"
import { fetchSignalSample, getSurveyState } from "@/lib/signal-history"

const DATA_DIR = process.env.SIGNAL_DATA_DIR || path.join(process.cwd(), ".data")
const FILE = path.join(DATA_DIR, "speed-tests.jsonl")

// Cloudflare rejects requests of 100 MB or more, so each stream repeats 25 MB.
const DOWN_URL = "https://speed.cloudflare.com/__down?bytes=25000000"
const UP_URL = "https://speed.cloudflare.com/__up"
// Latency probes go to a different origin than the bulk streams so they get
// their own kept-alive connection instead of queueing behind a busy one.
const PROBE_URL = "https://1.1.1.1/cdn-cgi/trace"

const STREAMS = 4
const PHASE_MS = 8000
const RAMP_MS = 2000 // TCP slow start; excluded from the download rate
const UP_CHUNK = 1_000_000
const PROBE_EVERY_MS = 400
const PROBE_TIMEOUT_MS = 3000

export interface SpeedTestResult {
  t: number // epoch ms the test started
  downMbps: number
  upMbps: number
  idleMs: number // median idle latency
  loadedDownMs: number // median latency while downloading
  loadedUpMs: number // median latency while uploading
  loadedP90Ms: number // 90th percentile across both loaded phases
  probeLoss: number // loaded-phase probes that timed out or failed
  colo: string // Cloudflare data center that answered
  signal?: { rsrp: number; rsrq: number; sinr: number; bands: string[]; gnbid: number; cid: number }
  loc?: string
  visit?: number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const i = Math.min(sorted.length - 1, Math.floor(sorted.length * p))
  return Math.round(sorted[i])
}

const mbps = (bytes: number, ms: number) =>
  ms > 0 ? Math.round(((bytes * 8) / (ms / 1000) / 1e6) * 10) / 10 : 0

// One round trip on the warm probe connection, or null if it timed out.
async function probe(): Promise<{ ms: number; body: string } | null> {
  const start = performance.now()
  try {
    const res = await fetch(PROBE_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    const body = await res.text()
    return { ms: performance.now() - start, body }
  } catch {
    return null
  }
}

// Probe repeatedly until `done` resolves; returns RTTs and the failure count.
async function probeWhile(done: Promise<unknown>): Promise<{ rtts: number[]; lost: number }> {
  let finished = false
  void done.finally(() => (finished = true))
  const rtts: number[] = []
  let lost = 0
  while (!finished) {
    const r = await probe()
    if (r) rtts.push(r.ms)
    else lost++
    await sleep(PROBE_EVERY_MS)
  }
  return { rtts, lost }
}

async function download(): Promise<number> {
  const controller = new AbortController()
  const start = performance.now()
  let total = 0
  let atRamp = -1

  const stream = async () => {
    while (!controller.signal.aborted) {
      try {
        const res = await fetch(DOWN_URL, { cache: "no-store", signal: controller.signal })
        if (!res.ok || !res.body) throw new Error(`download HTTP ${res.status}`)
        const reader = res.body.getReader()
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          total += value.byteLength
        }
      } catch {
        return // aborted at the deadline, or the stream failed
      }
    }
  }

  const streams = Array.from({ length: STREAMS }, stream)
  await sleep(RAMP_MS)
  atRamp = total
  await sleep(PHASE_MS - RAMP_MS)
  const end = performance.now()
  const bytes = total - atRamp
  controller.abort()
  await Promise.allSettled(streams)
  return mbps(bytes, end - start - RAMP_MS)
}

async function upload(): Promise<number> {
  const controller = new AbortController()
  const chunk = new Uint8Array(UP_CHUNK)
  const start = performance.now()
  const deadline = start + PHASE_MS
  let completed = 0
  let lastDone = start

  // Only finished POSTs count, timed to the last one that finished, so a
  // chunk cut off at the deadline does not drag the rate down.
  const stream = async () => {
    while (performance.now() < deadline) {
      try {
        const res = await fetch(UP_URL, {
          method: "POST",
          body: chunk,
          headers: { "Content-Type": "application/octet-stream" },
          signal: controller.signal,
        })
        await res.arrayBuffer()
        if (!res.ok) throw new Error(`upload HTTP ${res.status}`)
        completed += UP_CHUNK
        lastDone = performance.now()
      } catch {
        return
      }
    }
  }

  const streams = Array.from({ length: STREAMS }, stream)
  const timer = setTimeout(() => controller.abort(), PHASE_MS)
  await Promise.allSettled(streams)
  clearTimeout(timer)
  return mbps(completed, lastDone - start)
}

declare global {
  var __speedTestRunning: boolean | undefined
}

export function isSpeedTestRunning(): boolean {
  return globalThis.__speedTestRunning === true
}

// Run one full test and append it to the store. Returns null if a test is
// already running.
export async function runSpeedTest(): Promise<SpeedTestResult | null> {
  if (globalThis.__speedTestRunning) return null
  globalThis.__speedTestRunning = true
  try {
    const t = Date.now()
    const [sample, survey] = await Promise.all([
      fetchSignalSample().catch(() => null),
      getSurveyState(),
    ])

    const warm = await probe() // opens the probe connection; not counted
    const idle: number[] = []
    for (let i = 0; i < 8; i++) {
      const r = await probe()
      if (r) idle.push(r.ms)
      await sleep(150)
    }

    const down = download()
    const downProbes = await probeWhile(down)
    const downMbps = await down

    const up = upload()
    const upProbes = await probeWhile(up)
    const upMbps = await up
    // Every stream failing (offline, or Cloudflare refusing) is a failed test,
    // not a 0 Mbps reading to rank a placement by.
    if (downMbps === 0 || upMbps === 0) {
      throw new Error(`no throughput measured (down ${downMbps}, up ${upMbps})`)
    }

    const result: SpeedTestResult = {
      t,
      downMbps,
      upMbps,
      idleMs: percentile(idle, 0.5),
      loadedDownMs: percentile(downProbes.rtts, 0.5),
      loadedUpMs: percentile(upProbes.rtts, 0.5),
      loadedP90Ms: percentile([...downProbes.rtts, ...upProbes.rtts], 0.9),
      probeLoss: downProbes.lost + upProbes.lost,
      colo: warm?.body.match(/^colo=(\w+)/m)?.[1] ?? "",
    }
    if (sample) {
      result.signal = {
        rsrp: sample.rsrp,
        rsrq: sample.rsrq,
        sinr: sample.sinr,
        bands: sample.bands,
        gnbid: sample.gnbid,
        cid: sample.cid,
      }
    }
    if (survey) {
      result.loc = survey.location
      result.visit = survey.since
    }

    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.appendFile(FILE, JSON.stringify(result) + "\n", "utf8")
    return result
  } finally {
    globalThis.__speedTestRunning = false
  }
}

export async function readSpeedTests(): Promise<SpeedTestResult[]> {
  let text: string
  try {
    text = await fs.readFile(FILE, "utf8")
  } catch {
    return []
  }
  const out: SpeedTestResult[] = []
  for (const line of text.split("\n")) {
    if (!line.trim()) continue
    try {
      out.push(JSON.parse(line))
    } catch {
      // skip a partially-written line
    }
  }
  return out
}

// Drop one survey location's speed tests, alongside its signal samples.
export async function deleteSpeedTests(location: string): Promise<void> {
  const all = await readSpeedTests()
  const kept = all.filter((e) => e.loc !== location)
  if (kept.length === all.length) return
  await fs.writeFile(FILE, kept.map((e) => JSON.stringify(e) + "\n").join(""), "utf8")
}
