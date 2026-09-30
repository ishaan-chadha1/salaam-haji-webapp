import clsx from 'clsx'
import { ArrowLeft, ArrowRight, CheckCircle2, Footprints, Pause, Play, Plus, Route, Satellite, Square, Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Notice, Page, PageHeader, Sheet } from '../../components/ui'
import { formatDistance } from '../../lib/geo'
import { HolySites } from '../../lib/holySites'
import { CompletionView } from './CompletionView'
import { DuaCard, SaiDuaCard, StartGuideCard, WrongWayBanner } from './components/TawafCards'
import { KaabaRing } from './components/KaabaRing'
import { RouteMap } from './components/RouteMap'
import { elapsedMs, formatDuration, stageLabel, useRitual, type GpsStatus, type Stage } from './ritualStore'

export function TrackingScreen() {
  const { stage: param } = useParams()
  const navigate = useNavigate()
  const r = useRitual()
  const [, tick] = useState(0)
  const [endOpen, setEndOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  if (r.completed) return <CompletionView />

  const stage: Stage = r.session?.stage ?? (param === 'sai' ? 'sai' : 'tawaf')
  const s = r.session
  if (!s) {
    return (
      <Page>
        <PageHeader title={stageLabel(stage)} />
        <Card>
          <p className="font-semibold text-ink">No {stageLabel(stage)} in progress</p>
          <p className="mt-1 text-sm text-muted">Start one to count your laps live.</p>
          <Button className="mt-3" onClick={() => r.start(stage)}>Start {stageLabel(stage)}</Button>
        </Card>
      </Page>
    )
  }

  const paused = s.pauseStart != null
  const live = r.tawafLive
  const isTawaf = s.stage === 'tawaf'
  const reachedStart = live?.reachedStart ?? false

  return (
    <Page>
      <PageHeader title={stageLabel(s.stage)} subtitle={s.isDemo ? 'Demo · simulated pilgrim' : 'Live tracking'} action={<GpsBadge status={r.gps} accuracy={isTawaf ? live?.accuracy : r.saiLive?.accuracy} />} />

      <div className="space-y-3">
        {isTawaf && live && live.direction === -1 && reachedStart && !paused && <WrongWayBanner />}
        {r.gpsError && !s.isDemo && <Notice tone="warn">{r.gpsError}</Notice>}

        <Card className="flex flex-col items-center py-5">
          {isTawaf ? (
            <div className="relative text-ink">
              <KaabaRing
                bearing={live?.bearingFromCenter ?? null}
                startBearing={live?.startBearingDeg ?? 105.4}
                lapFraction={live?.lapFraction ?? 0}
                laps={s.laps}
                totalLaps={s.totalLaps}
                reachedStart={reachedStart}
              />
            </div>
          ) : (
            <SaiBar progress={r.saiLive?.progress ?? 0} laps={s.laps} heading={r.saiLive?.heading ?? 1} started={r.saiLive != null} />
          )}
          <p className="mt-2 text-5xl font-bold text-ink tabular-nums">
            {s.laps}<span className="text-2xl text-muted"> / {s.totalLaps}</span>
          </p>
          <p className="text-sm text-muted">{isTawaf ? 'laps' : 'trips'}{paused ? ' · paused' : ''}</p>
          {!isTawaf && <TripBar laps={s.laps} total={s.totalLaps} current={r.saiLive?.tripFraction ?? 0} />}
        </Card>

        <div className="grid grid-cols-3 gap-2">
          <Stat icon={<Timer />} label="Time" value={formatDuration(elapsedMs(s))} />
          <Stat icon={<Footprints />} label="Steps" value={r.steps.toLocaleString()} />
          <Stat icon={<Route />} label="Distance" value={formatDistance(r.distance)} />
        </div>

        {s.isDemo && (
          <Card className="border-gold/50">
            <p className="font-bold text-ink">Demo walk</p>
            <p className="mt-1 text-sm text-muted">
              {r.simulating
                ? `Walking… ${isTawaf ? 'laps' : 'trips'} are counted automatically, exactly as on a real ${stageLabel(s.stage)}.`
                : r.simPending
                  ? 'The walk is paused. Continue to finish the laps.'
                  : `A simulated pilgrim stands ${isTawaf ? 'on the far side of the Kaaba' : 'at Safa'}. Play the walk to watch the laps count themselves.`}
            </p>
            {!r.simulating && (
              <Button className="mt-3" onClick={r.playDemoWalk}>
                <Play className="size-4" /> {r.simPending ? 'Continue demo walk' : 'Play demo walk'}
              </Button>
            )}
          </Card>
        )}

        {isTawaf && !reachedStart && <StartGuideCard live={live} />}
        {isTawaf && reachedStart && <DuaCard laps={s.laps} totalLaps={s.totalLaps} lapFraction={live?.lapFraction ?? 0} />}
        {!isTawaf && r.saiLive && (
          <SaiDuaCard laps={s.laps} totalLaps={s.totalLaps} tripFraction={r.saiLive.tripFraction} heading={r.saiLive.heading} />
        )}

        {isTawaf ? (
          <RouteMap
            center={HolySites.kaaba}
            start={HolySites.hajarAlAswad}
            route={r.route}
            me={live?.position ?? null}
            zoom={19}
            height={260}
          />
        ) : (
          <RouteMap
            center={{ lat: (HolySites.safa.lat + HolySites.marwah.lat) / 2, lng: (HolySites.safa.lng + HolySites.marwah.lng) / 2 }}
            route={r.route}
            me={r.saiLive?.position ?? null}
            zoom={17}
            height={260}
            extraPoints={[
              { at: HolySites.safa, label: 'Safa', color: '#059669' },
              { at: HolySites.marwah, label: 'Marwah', color: '#d4af37' },
            ]}
          />
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {paused ? (
            <Button onClick={r.resume}><Play className="size-4" /> Resume</Button>
          ) : (
            <Button variant="secondary" onClick={r.pause}><Pause className="size-4" /> Pause</Button>
          )}
          <Button variant="secondary" onClick={r.addManualLap} disabled={paused}><Plus className="size-4" /> Lap</Button>
          <Button variant="secondary" onClick={() => setCompleteOpen(true)}><CheckCircle2 className="size-4" /> Complete</Button>
          <Button variant="danger" onClick={() => setEndOpen(true)}><Square className="size-4" /> End</Button>
        </div>

        {!s.isDemo && (
          <p className="text-center text-xs text-muted">
            Keep this screen open while you walk — browsers pause location when the screen is off or the tab is hidden.
            {r.wakeLockActive ? ' The screen will stay awake.' : ''}
          </p>
        )}
      </div>

      <Sheet open={endOpen} onClose={() => setEndOpen(false)} title={`End ${stageLabel(s.stage)}?`}>
        <p className="text-muted">Your {s.laps} {isTawaf ? 'laps' : 'trips'} will not be saved to history.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setEndOpen(false)}>Keep going</Button>
          <Button variant="danger" onClick={() => { r.end(); navigate('/ritual') }}>End</Button>
        </div>
      </Sheet>
      <Sheet open={completeOpen} onClose={() => setCompleteOpen(false)} title="Mark as complete?">
        <p className="text-muted">Use this if you finished all 7 {isTawaf ? 'laps' : 'trips'} but tracking missed some.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setCompleteOpen(false)}>Cancel</Button>
          <Button onClick={() => { setCompleteOpen(false); r.markComplete() }}>Complete</Button>
        </div>
      </Sheet>
    </Page>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-3">
      <p className="flex items-center gap-1 text-xs text-muted [&>svg]:size-3.5">{icon} {label}</p>
      <p className="mt-0.5 text-lg font-bold text-ink tabular-nums">{value}</p>
    </Card>
  )
}

function GpsBadge({ status, accuracy }: { status: GpsStatus; accuracy?: number }) {
  const map: Record<GpsStatus, [string, string]> = {
    idle: ['GPS off', 'bg-surface-2 text-muted'],
    waiting: ['Finding GPS…', 'bg-gold-soft text-ink'],
    ok: [accuracy != null ? `GPS ±${Math.round(accuracy)} m` : 'GPS on', 'bg-primary/15 text-primary'],
    weak: [accuracy != null ? `Weak GPS ±${Math.round(accuracy)} m` : 'Weak GPS', 'bg-gold-soft text-ink'],
    denied: ['Location blocked', 'bg-danger/15 text-danger'],
    unavailable: ['No GPS', 'bg-danger/15 text-danger'],
    demo: ['Demo', 'bg-gold-soft text-ink'],
  }
  const [label, cls] = map[status]
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap', cls)}>
      <Satellite className="size-3.5" /> {label}
    </span>
  )
}

function SaiBar({ progress, laps, heading, started }: { progress: number; laps: number; heading: 1 | -1; started: boolean }) {
  const toMarwah = heading === 1
  return (
    <div className="w-full max-w-sm px-2 py-4">
      <div className="mb-2 flex justify-between text-sm font-semibold text-ink">
        <span>Safa <span className="arabic text-gold">الصفا</span></span>
        <span>Marwah <span className="arabic text-gold">المروة</span></span>
      </div>
      <div className="relative h-3 rounded-full bg-surface-2">
        <div
          className="absolute top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-emerald text-white shadow transition-all"
          style={{ left: `${Math.min(100, Math.max(0, progress * 100))}%` }}
        >
          {toMarwah ? <ArrowRight className="size-4" /> : <ArrowLeft className="size-4" />}
        </div>
      </div>
      <p className="mt-3 text-center text-sm font-semibold text-emerald">
        {laps >= 7 ? "Sa'i complete at Marwah" : started ? `Trip ${laps + 1} · to ${toMarwah ? 'Marwah' : 'Safa'}` : 'Start at Safa'}
      </p>
    </div>
  )
}

/** Seven trips: done ones gold, the current one filling up. */
function TripBar({ laps, total, current }: { laps: number; total: number; current: number }) {
  return (
    <div className="mt-3 flex w-full max-w-sm gap-1 px-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="h-2 flex-1 overflow-hidden rounded bg-surface-2">
          <div
            className={clsx('h-full transition-all', i < laps ? 'bg-gold' : 'bg-emerald')}
            style={{ width: `${i < laps ? 100 : i === laps ? Math.round(current * 100) : 0}%` }}
          />
        </div>
      ))}
    </div>
  )
}
