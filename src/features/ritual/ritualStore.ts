import { create } from 'zustand'
import { load, save } from '../../lib/storage'
import { TawafGeometry } from './engine/geometry'
import { SaiTracker, TawafTracker, type Fix, type SaiLiveInfo, type TawafLiveInfo } from './engine/tracker'
import { ALL_ITEMS } from './umrahData'

export type Stage = 'tawaf' | 'sai'
export type GpsStatus = 'idle' | 'waiting' | 'ok' | 'weak' | 'denied' | 'unavailable' | 'demo'

export type Session = {
  id: string
  stage: Stage
  source: 'manual' | 'checklist'
  checklistItemId?: string
  startTime: number
  pausedMs: number
  pauseStart: number | null
  laps: number
  totalLaps: number
  lapTimes: number[] // ms timestamps of each completed lap
  /** When lap 1 began: reaching the Black Stone for Tawaf, the start for Sa'i. */
  lapBase: number | null
  isDemo: boolean
}

export type HistoryEntry = {
  id: string
  stage: Stage
  startTime: number
  endTime: number
  durationMs: number
  steps: number
  distance: number
  laps: number
  lapDurationsMs: number[]
  completion: 'liveTracked' | 'manualMode' | 'checklistMarked'
  source: 'manual' | 'checklist'
  checklistItemTitle?: string
  journal?: string
  /** Flattened [lat, lng, ...] route for the ring map (Tawaf). */
  route?: number[]
  /** [centreLat, centreLng, startLat, startLng]. */
  tawafSite?: number[]
  isDemo?: boolean
}

type ChecklistState = Record<string, { at: number; kind: 'manual' | 'tracked' }>

type RitualState = {
  demoMode: boolean
  session: Session | null
  tawafLive: TawafLiveInfo | null
  saiLive: SaiLiveInfo | null
  route: { lat: number; lng: number }[]
  distance: number
  steps: number
  gps: GpsStatus
  gpsError: string | null
  simulating: boolean
  simPending: boolean
  completed: HistoryEntry | null
  history: HistoryEntry[]
  checklist: ChecklistState
  wakeLockActive: boolean
  /** How long location stopped while the screen was locked or the tab hidden
   *  during a live ritual (browsers stop location then). Null when none. */
  lockGapMs: number | null

  dismissLockGap: () => void
  setDemoMode: (on: boolean) => void
  start: (stage: Stage, opts?: { source?: 'manual' | 'checklist'; checklistItemId?: string }) => void
  pause: () => void
  resume: () => void
  addManualLap: () => void
  markComplete: () => void
  end: () => void
  playDemoWalk: () => void
  saveJournal: (text: string) => void
  dismissCompletion: () => void
  clearHistory: () => void
  toggleItem: (id: string) => void
  resetChecklist: () => void
}

const HISTORY_KEY = 'ritual_history_v1'
const CHECKLIST_KEY = 'umrah_checklist_v1'
const DEMO_KEY = 'ritual_demo_mode_v1'
const SESSION_KEY = 'ritual_session_v1'

// Engine objects live outside React state: they mutate on every fix.
const tawaf = new TawafTracker(TawafGeometry.makkah)
const sai = new SaiTracker()
let watchId: number | null = null
let simTimer: ReturnType<typeof setInterval> | null = null
let simFixes: Fix[] | null = null
let simIndex = 0
let wakeLock: WakeLockSentinel | null = null

const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)

async function requestWakeLock(set: (p: Partial<RitualState>) => void) {
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen')
      set({ wakeLockActive: true })
      wakeLock.addEventListener('release', () => set({ wakeLockActive: false }))
    }
  } catch {
    set({ wakeLockActive: false })
  }
}

function releaseWakeLock() {
  wakeLock?.release().catch(() => {})
  wakeLock = null
}

function stopFeeds() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId)
  watchId = null
  if (simTimer) clearInterval(simTimer)
  simTimer = null
}

function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // unsupported
  }
}

export const useRitual = create<RitualState>((set, get) => {
  /** One fix through the right tracker, then publish. */
  function onFix(fix: Fix) {
    const s = get().session
    if (!s || s.pauseStart != null) return
    const tracker = s.stage === 'tawaf' ? tawaf : sai
    const completedLaps = tracker.handleFix(fix)
    const patch: Partial<RitualState> = {
      distance: tracker.totalDistance,
      steps: tracker.steps,
      route: [...tracker.route],
    }
    if (s.stage === 'tawaf') patch.tawafLive = tawaf.live
    else patch.saiLive = sai.live
    if (!s.isDemo) patch.gps = fix.accuracy > 35 ? 'weak' : 'ok'
    if (s.lapBase == null && (s.stage === 'sai' || tawaf.counter.hasReachedStart)) {
      patch.session = { ...s, lapBase: Date.now() }
    }
    set(patch)
    for (let i = 0; i < completedLaps; i++) addLap(false)
  }

  function addLap(manual: boolean) {
    const s = get().session
    if (!s || s.laps >= s.totalLaps) return
    const laps = s.laps + 1
    const session = { ...s, laps, lapTimes: [...s.lapTimes, Date.now()] }
    set({ session })
    persistSession(session)
    buzz(laps >= s.totalLaps ? [200, 100, 200, 100, 400] : 250)
    if (laps >= s.totalLaps) finish(manual ? 'manualMode' : 'liveTracked')
  }

  function persistSession(session: Session | null) {
    save(SESSION_KEY, session)
  }

  function startGps() {
    if (!('geolocation' in navigator)) {
      set({ gps: 'unavailable', gpsError: 'This browser cannot share location.' })
      return
    }
    set({ gps: 'waiting', gpsError: null })
    watchId = navigator.geolocation.watchPosition(
      (p) => onFix({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, time: p.timestamp || Date.now() }),
      (e) =>
        set({
          gps: e.code === e.PERMISSION_DENIED ? 'denied' : 'unavailable',
          gpsError:
            e.code === e.PERMISSION_DENIED
              ? 'Location is blocked. Allow it in the browser to count laps, or use +1 to count by hand.'
              : 'No GPS signal yet. Laps can still be added with +1.',
        }),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    )
  }

  function runSimulation() {
    const s = get().session
    if (!s) return
    if (!simFixes || simIndex >= simFixes.length) {
      simFixes = s.stage === 'tawaf' ? tawaf.prepareSimulation() : (sai.reset(), SaiTracker.simulatedWalk())
      simIndex = 0
      // A fresh walk restarts the count from the far side of the Kaaba.
      const reset = { ...s, laps: 0, lapTimes: [], lapBase: null }
      set({ session: reset, distance: 0, steps: 0, route: [] })
    }
    set({ simulating: true, simPending: true })
    // ~8x real time, like the phone (120 ms per simulated second).
    simTimer = setInterval(() => {
      if (!simFixes || simIndex >= simFixes.length) {
        if (simTimer) clearInterval(simTimer)
        simTimer = null
        simFixes = null
        set({ simulating: false, simPending: false })
        return
      }
      onFix(simFixes[simIndex++])
    }, s.stage === 'tawaf' ? 120 : 60)
  }

  function finish(kind: HistoryEntry['completion']) {
    const s = get().session
    if (!s) return
    stopFeeds()
    releaseWakeLock()
    simFixes = null
    const end = Date.now()
    const isTawaf = s.stage === 'tawaf'
    const tracker = isTawaf ? tawaf : sai
    const lapDurationsMs = s.lapTimes.map((t, i) => t - (i === 0 ? (s.lapBase ?? s.startTime) : s.lapTimes[i - 1]))
    const item = s.checklistItemId ? ALL_ITEMS.find((i) => i.id === s.checklistItemId) : undefined
    const entry: HistoryEntry = {
      id: s.id,
      stage: s.stage,
      startTime: s.startTime,
      endTime: end,
      durationMs: end - s.startTime - s.pausedMs,
      steps: tracker.steps,
      distance: tracker.totalDistance,
      laps: s.laps,
      lapDurationsMs,
      completion: kind,
      source: s.source,
      checklistItemTitle: item?.title,
      route: isTawaf ? tawaf.thinnedRoute() : undefined,
      tawafSite: isTawaf ? [tawaf.geometry.center.lat, tawaf.geometry.center.lng, tawaf.geometry.start.lat, tawaf.geometry.start.lng] : undefined,
      isDemo: s.isDemo,
    }
    const history = [entry, ...get().history].slice(0, 100)
    save(HISTORY_KEY, history)
    let checklist = get().checklist
    if (s.checklistItemId && s.laps >= s.totalLaps) {
      checklist = { ...checklist, [s.checklistItemId]: { at: end, kind: 'tracked' } }
      save(CHECKLIST_KEY, checklist)
    }
    persistSession(null)
    set({ lockGapMs: null, session: null, completed: entry, history, checklist, simulating: false, simPending: false, gps: 'idle' })
  }

  return {
    demoMode: load(DEMO_KEY, false),
    // A ritual interrupted by a reload comes back paused, laps kept.
    session: restoreSession(),
    tawafLive: null,
    saiLive: null,
    route: [],
    distance: 0,
    steps: 0,
    gps: 'idle',
    gpsError: null,
    simulating: false,
    simPending: false,
    completed: null,
    history: load<HistoryEntry[]>(HISTORY_KEY, []),
    checklist: load<ChecklistState>(CHECKLIST_KEY, {}),
    wakeLockActive: false,
    lockGapMs: null,

    dismissLockGap: () => set({ lockGapMs: null }),

    setDemoMode: (on) => {
      save(DEMO_KEY, on)
      set({ demoMode: on })
    },

    start: (stage, opts = {}) => {
      stopFeeds()
      const isDemo = get().demoMode
      tawaf.reset(TawafGeometry.makkah)
      sai.reset()
      simFixes = null
      simIndex = 0
      const session: Session = {
        id: uuid(),
        stage,
        source: opts.source ?? 'manual',
        checklistItemId: opts.checklistItemId,
        startTime: Date.now(),
        pausedMs: 0,
        pauseStart: null,
        laps: 0,
        totalLaps: 7,
        lapTimes: [],
        lapBase: null,
        isDemo,
      }
      persistSession(session)
      set({ session, completed: null, tawafLive: null, saiLive: null, route: [], distance: 0, steps: 0, gpsError: null, simulating: false, simPending: false, lockGapMs: null })
      requestWakeLock(set)
      if (isDemo) {
        set({ gps: 'demo' })
        // A demo pilgrim stands on the far side of the real Kaaba (or at Safa).
        const first = stage === 'tawaf' ? tawaf.prepareSimulation()[0] : SaiTracker.simulatedWalk()[0]
        onFix(first)
        if (stage === 'tawaf') tawaf.reset()
        else sai.reset()
      } else {
        startGps()
      }
    },

    pause: () => {
      const s = get().session
      if (!s || s.pauseStart != null) return
      const wasSimulating = simTimer != null
      stopFeeds()
      const session = { ...s, pauseStart: Date.now() }
      persistSession(session)
      set({ session, simulating: false, simPending: wasSimulating || get().simPending })
    },

    resume: () => {
      const s = get().session
      if (!s || s.pauseStart == null) return
      const session = { ...s, pausedMs: s.pausedMs + (Date.now() - s.pauseStart), pauseStart: null }
      persistSession(session)
      set({ session })
      requestWakeLock(set)
      if (s.isDemo) {
        if (simFixes && simIndex < simFixes.length) runSimulation()
      } else startGps()
    },

    addManualLap: () => {
      if (get().session?.stage === 'tawaf') tawaf.counter.addManualLap()
      addLap(true)
    },

    markComplete: () => {
      const s = get().session
      if (!s) return
      set({ session: { ...s, laps: s.totalLaps } })
      finish('manualMode')
    },

    end: () => {
      stopFeeds()
      releaseWakeLock()
      simFixes = null
      persistSession(null)
      set({ session: null, tawafLive: null, saiLive: null, route: [], gps: 'idle', simulating: false, simPending: false, lockGapMs: null })
    },

    playDemoWalk: () => {
      const s = get().session
      if (!s?.isDemo || simTimer) return
      if (s.pauseStart != null) get().resume()
      if (!simTimer) runSimulation()
    },

    saveJournal: (text) => {
      const c = get().completed
      if (!c) return
      const history = get().history.map((h) => (h.id === c.id ? { ...h, journal: text } : h))
      save(HISTORY_KEY, history)
      set({ history, completed: { ...c, journal: text } })
    },

    dismissCompletion: () => set({ completed: null, tawafLive: null, saiLive: null, route: [] }),

    clearHistory: () => {
      save(HISTORY_KEY, [])
      set({ history: [] })
    },

    toggleItem: (id) => {
      const checklist = { ...get().checklist }
      if (checklist[id]) delete checklist[id]
      else checklist[id] = { at: Date.now(), kind: 'manual' }
      save(CHECKLIST_KEY, checklist)
      set({ checklist })
    },

    resetChecklist: () => {
      save(CHECKLIST_KEY, {})
      set({ checklist: {} })
    },
  }
})

/** When a live ritual's tab was hidden (screen locked, app switched). */
let hiddenAt: number | null = null

/** A gap shorter than this is not worth mentioning. */
const LOCK_GAP_NOTICE_MS = 15_000

// Browsers stop location while the screen is locked or the tab is hidden.
// Note how long, so the pilgrim can add laps walked meanwhile; and reacquire
// the screen wake lock on return.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    const st = useRitual.getState()
    const s = st.session
    const live = s != null && s.pauseStart == null && !s.isDemo && s.laps < s.totalLaps
    if (document.visibilityState === 'hidden') {
      hiddenAt = live ? Date.now() : null
      return
    }
    if (s && s.pauseStart == null) requestWakeLock(useRitual.setState)
    if (live && hiddenAt != null) {
      const gap = Date.now() - hiddenAt
      if (gap >= LOCK_GAP_NOTICE_MS) useRitual.setState({ lockGapMs: (st.lockGapMs ?? 0) + gap })
    }
    hiddenAt = null
  })
}

function restoreSession(): Session | null {
  const s = load<Session | null>(SESSION_KEY, null)
  if (!s) return null
  return s.pauseStart == null ? { ...s, pauseStart: Date.now() } : s
}

export function elapsedMs(s: Session, now = Date.now()): number {
  const pausedNow = s.pauseStart != null ? now - s.pauseStart : 0
  return Math.max(0, now - s.startTime - s.pausedMs - pausedNow)
}

export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`
}

export const stageLabel = (s: Stage) => (s === 'tawaf' ? 'Tawaf' : "Sa'i")
