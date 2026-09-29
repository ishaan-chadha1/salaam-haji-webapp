import { ChevronRight, Footprints, History, PlayCircle, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Page, PageHeader, Sheet } from '../../components/ui'
import { FeatureFlags } from '../../lib/featureFlags'
import { stageLabel, useRitual, type Stage } from './ritualStore'
import { ALL_ITEMS } from './umrahData'

export function RitualScreen() {
  const navigate = useNavigate()
  const { session, demoMode, setDemoMode, start, checklist } = useRitual()
  const [hajjOpen, setHajjOpen] = useState(false)
  const [confirmStage, setConfirmStage] = useState<Stage | null>(null)
  const done = ALL_ITEMS.filter((i) => checklist[i.id]).length

  function begin(stage: Stage) {
    if (session) return setConfirmStage(stage)
    start(stage)
    navigate(`/ritual/track/${stage}`)
  }

  return (
    <Page>
      <PageHeader title="Rituals" subtitle="Choose your spiritual journey" back={false} />

      {session && (
        <Card onClick={() => navigate(`/ritual/track/${session.stage}`)} className="mb-4 border-primary/40 bg-primary/10">
          <div className="flex items-center gap-3">
            <PlayCircle className="size-8 text-primary" />
            <div className="flex-1">
              <p className="font-semibold text-ink">{stageLabel(session.stage)} in progress</p>
              <p className="text-sm text-muted">
                Lap {session.laps} of {session.totalLaps}
                {session.pauseStart != null ? ' · paused' : ''}
                {session.isDemo ? ' · demo' : ''}
              </p>
            </div>
            <ChevronRight className="size-5 text-muted" />
          </div>
        </Card>
      )}

      <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">Featured rituals</h2>
      <div className="grid grid-cols-2 gap-3">
        <RitualTile title="Umrah" arabic="عمرة" subtitle="Lesser Pilgrimage" image="/images/umrah_tile_ritual.jpg" onClick={() => navigate('/ritual/umrah')}
          badge={done > 0 ? `${done}/${ALL_ITEMS.length} steps` : undefined} />
        <RitualTile title="Hajj" arabic="حج" subtitle="Greater Pilgrimage" image="/images/hajj_ritual_tile.jpg"
          onClick={() => (FeatureFlags.hajjEnabled ? undefined : setHajjOpen(true))} badge={FeatureFlags.hajjEnabled ? undefined : 'Coming soon'} />
      </div>

      <h2 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-muted uppercase">Quick actions</h2>
      <div className="grid gap-2 sm:grid-cols-3">
        <QuickAction icon={<RotateCw />} title="Start Tawaf" subtitle="7 laps around the Kaaba" onClick={() => begin('tawaf')} />
        <QuickAction icon={<Footprints />} title="Start Sa'i" subtitle="7 trips between Safa & Marwah" onClick={() => begin('sai')} />
        <QuickAction icon={<History />} title="History" subtitle="View past rituals" onClick={() => navigate('/ritual/history')} />
      </div>

      <Card className="mt-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-1 size-5 accent-[var(--primary)]" checked={demoMode} onChange={(e) => setDemoMode(e.target.checked)} />
          <span>
            <span className="block font-semibold text-ink">Demo mode</span>
            <span className="block text-sm text-muted">
              Try live Tawaf and Sa'i away from the Haram. A simulated pilgrim walks the real route through the same lap counter; your real location is never used.
            </span>
          </span>
        </label>
      </Card>

      <Sheet open={hajjOpen} onClose={() => setHajjOpen(false)} title="Coming soon">
        <p className="text-muted">Hajj rituals are not available yet. We are focusing on Umrah for now — Hajj will follow in a later update.</p>
        <Button className="mt-4 w-full" onClick={() => setHajjOpen(false)}>Got it</Button>
      </Sheet>

      <Sheet open={confirmStage != null} onClose={() => setConfirmStage(null)} title="Start a new ritual?">
        <p className="text-muted">
          {session && `Your ${stageLabel(session.stage)} (lap ${session.laps} of 7) will end without being saved.`}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => session && navigate(`/ritual/track/${session.stage}`)}>Continue current</Button>
          <Button
            onClick={() => {
              if (!confirmStage) return
              start(confirmStage)
              navigate(`/ritual/track/${confirmStage}`)
            }}
          >
            Start new
          </Button>
        </div>
      </Sheet>
    </Page>
  )
}

function RitualTile({ title, arabic, subtitle, image, onClick, badge }: { title: string; arabic: string; subtitle: string; image: string; onClick: () => void; badge?: string }) {
  return (
    <button onClick={onClick} className="group relative aspect-[0.85] overflow-hidden rounded-2xl text-left shadow-sm">
      <img src={image} alt="" className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-105" />
      <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      {badge && <span className="absolute top-3 left-3 rounded-full bg-black/55 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur">{badge}</span>}
      <span className="absolute inset-x-3 bottom-3 text-white">
        <span className="arabic block text-right text-lg leading-tight text-[#eab308]">{arabic}</span>
        <span className="block text-xl font-bold">{title}</span>
        <span className="block text-xs text-white/75">{subtitle}</span>
      </span>
    </button>
  )
}

function QuickAction({ icon, title, subtitle, onClick }: { icon: React.ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition hover:border-primary/50">
      <span className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary [&>svg]:size-5">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="block truncate text-xs text-muted">{subtitle}</span>
      </span>
    </button>
  )
}
