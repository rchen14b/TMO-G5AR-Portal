// Server-side 5G signal history: polls the gateway and appends samples to a
// JSONL file so the dashboard can chart signal quality over time (useful for
// finding the best antenna placement / tracking performance).
//
// Storage is a plain append-only JSONL file (one JSON sample per line) — no
// database dependency, survives restarts, and is trivial to export. Configure
// via env vars:
//   ROUTER_IP                 gateway IP to poll       (default 192.168.12.1)
//   SIGNAL_DATA_DIR           directory for the file   (default <cwd>/.data)
//   SIGNAL_MAX_ENTRIES        retained samples cap     (default 20000)
import { promises as fs } from "fs"
import path from "path"

const DATA_DIR = process.env.SIGNAL_DATA_DIR || path.join(process.cwd(), ".data")
const FILE = path.join(DATA_DIR, "signal-history.jsonl")
const MAX_ENTRIES = Number(process.env.SIGNAL_MAX_ENTRIES) || 20000

export interface SignalSample {
  t: number // epoch milliseconds
  rsrp: number
  rsrq: number
  sinr: number
  rssi: number
  bars: number
  bands: string[]
  cid: number
  gnbid: number
  reg: string // registration state
  loc?: string // placement-survey location label, when a survey was active
  visit?: number // epoch ms the survey location was started (groups one visit)
}

function routerIp(): string {
  return process.env.ROUTER_IP || "192.168.12.1"
}

// The gateway exposes get=all without authentication, so the background poller
// needs no token (it runs outside any request/cookie context).
export async function fetchSignalSample(): Promise<SignalSample | null> {
  const res = await fetch(`http://${routerIp()}/TMI/v1/gateway?get=all`, {
    cache: "no-store",
    // The gateway goes dark while it reboots after being moved; don't let a
    // hung request stall the poller.
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) return null

  const data = await res.json()
  const s = data?.signal?.["5g"]
  if (!s || typeof s.rsrp !== "number") return null

  return {
    t: Date.now(),
    rsrp: s.rsrp,
    rsrq: s.rsrq,
    sinr: s.sinr,
    rssi: s.rssi,
    bars: s.bars,
    bands: Array.isArray(s.bands) ? s.bands : [],
    cid: s.cid,
    gnbid: s.gNBID,
    reg: data?.signal?.generic?.registration ?? "",
  }
}

async function readAll(): Promise<SignalSample[]> {
  let text: string
  try {
    text = await fs.readFile(FILE, "utf8")
  } catch {
    return [] // no history yet
  }

  const out: SignalSample[] = []
  for (const line of text.split("\n")) {
    if (!line.trim()) continue
    try {
      out.push(JSON.parse(line))
    } catch {
      // skip a partially-written / corrupt line rather than failing the read
    }
  }
  return out
}

let lastPrune = 0

// Keep the file from growing unbounded. Rewriting is O(file), so only do it
// occasionally (every ~30 min) rather than on every append.
async function maybePrune(): Promise<void> {
  const now = Date.now()
  if (now - lastPrune < 30 * 60 * 1000) return
  lastPrune = now

  const all = await readAll()
  if (all.length <= MAX_ENTRIES) return

  const trimmed = all.slice(-MAX_ENTRIES)
  await fs.writeFile(FILE, trimmed.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8")
}

// Poll the gateway once and append the sample. Returns the sample, or null if
// the gateway was unreachable / returned no 5G data.
export async function recordSample(
  survey?: SurveyState | null
): Promise<SignalSample | null> {
  const sample = await fetchSignalSample()
  if (!sample) return null
  if (survey) {
    sample.loc = survey.location
    sample.visit = survey.since
  }

  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.appendFile(FILE, JSON.stringify(sample) + "\n", "utf8")
  await maybePrune()
  return sample
}

// Read samples newer than `sinceMs` (epoch ms).
export async function readHistory(sinceMs: number): Promise<SignalSample[]> {
  const all = await readAll()
  return all.filter((e) => e.t >= sinceMs)
}

// ── Placement survey ───────────────────────────────────────────────────────
// While a survey location is set, every recorded sample is tagged with it and
// the poller samples faster, so moving the gateway room to room produces a
// per-location comparison. The active location is persisted so a server
// restart mid-survey keeps tagging. Kept on globalThis because Next.js can load
// this module once per route bundle.

export interface SurveyState {
  location: string
  since: number // epoch ms
}

const SURVEY_FILE = path.join(DATA_DIR, "survey-state.json")

declare global {
  var __surveyState: SurveyState | null | undefined
}

export async function getSurveyState(): Promise<SurveyState | null> {
  if (globalThis.__surveyState === undefined) {
    try {
      globalThis.__surveyState = JSON.parse(await fs.readFile(SURVEY_FILE, "utf8"))
    } catch {
      globalThis.__surveyState = null
    }
  }
  return globalThis.__surveyState ?? null
}

export async function setSurveyLocation(location: string | null): Promise<SurveyState | null> {
  const state = location ? { location, since: Date.now() } : null
  globalThis.__surveyState = state
  await fs.mkdir(DATA_DIR, { recursive: true })
  if (state) {
    await fs.writeFile(SURVEY_FILE, JSON.stringify(state), "utf8")
  } else {
    await fs.rm(SURVEY_FILE, { force: true })
  }
  return state
}

// All samples recorded during a survey, oldest first.
export async function readSurveySamples(): Promise<SignalSample[]> {
  const all = await readAll()
  return all.filter((e) => e.loc)
}

// Drop one location's survey samples (e.g. a mislabeled spot).
export async function deleteSurveyLocation(location: string): Promise<void> {
  const all = await readAll()
  const kept = all.filter((e) => e.loc !== location)
  if (kept.length === all.length) return
  await fs.writeFile(FILE, kept.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8")
}

// ── Background poller ──────────────────────────────────────────────────────
// A process-wide singleton interval that records a sample on a fixed cadence.
// We arm it lazily from the Node.js API routes, where `fs` is available. Calling ensurePoller() repeatedly is safe — it starts at
// most one interval per server process. Once armed it keeps recording for the
// life of the process, even with no browser open.
//
// Env vars:
//   SIGNAL_POLL_INTERVAL_MS   poll cadence in ms  (default 60000)
//   SIGNAL_SURVEY_INTERVAL_MS poll cadence while a survey location is set
//                             (default 10000)
//   SIGNAL_HISTORY_DISABLED   set to "1" to disable

declare global {
  var __signalPoller: NodeJS.Timeout | undefined
}

export function ensurePoller(): void {
  if (process.env.SIGNAL_HISTORY_DISABLED === "1") return
  if (globalThis.__signalPoller) return // already armed in this process

  const intervalMs = Number(process.env.SIGNAL_POLL_INTERVAL_MS) || 60000
  const surveyMs = Number(process.env.SIGNAL_SURVEY_INTERVAL_MS) || 10000

  // Tick at the faster cadence and skip until the active cadence is due, so
  // starting a survey speeds up sampling without re-arming the interval.
  let last = 0
  let busy = false
  const tick = async () => {
    if (busy) return
    busy = true
    try {
      const survey = await getSurveyState()
      const due = survey ? surveyMs : intervalMs
      if (Date.now() - last >= due - 500) {
        last = Date.now()
        await recordSample(survey)
      }
    } catch (err) {
      console.error("[signal-history] poll failed:", err)
    } finally {
      busy = false
    }
  }

  globalThis.__signalPoller = setInterval(tick, Math.min(intervalMs, surveyMs))
  void tick() // record immediately on first arm
  console.log(`[signal-history] polling gateway every ${intervalMs}ms`)
}
