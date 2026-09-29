import clsx from 'clsx'
import { Check, MapPin, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Notice, Page, PageHeader, Sheet } from '../../components/ui'
import { useRitual } from './ritualStore'
import { ALL_ITEMS, UMRAH_PHASES, type ItemType } from './umrahData'

const typeStyle: Record<ItemType, string> = {
  fard: 'bg-red-500/15 text-red-600 dark:text-red-400',
  wajib: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  sunnah: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
}

export function UmrahChecklistScreen() {
  const navigate = useNavigate()
  const { checklist, toggleItem, resetChecklist, start, session } = useRitual()
  const [resetOpen, setResetOpen] = useState(false)
  const done = ALL_ITEMS.filter((i) => checklist[i.id]).length
  const pct = Math.round((done / ALL_ITEMS.length) * 100)

  return (
    <Page>
      <PageHeader
        title="Umrah"
        subtitle="عمرة · step by step"
        action={
          <button aria-label="Start over" onClick={() => setResetOpen(true)} className="grid size-10 place-items-center rounded-full border border-line bg-surface">
            <RotateCcw className="size-5" />
          </button>
        }
      />

      <Card className="mb-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-muted">Your progress</p>
            <p className="text-2xl font-bold text-ink">{done} of {ALL_ITEMS.length} steps</p>
          </div>
          <p className="text-3xl font-bold text-primary">{pct}%</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        {done === ALL_ITEMS.length && <div className="mt-3"><Notice tone="success">Umrah complete — may Allah accept it.</Notice></div>}
      </Card>

      <ol className="space-y-5">
        {UMRAH_PHASES.map((phase, pi) => {
          const phaseDone = phase.items.every((i) => checklist[i.id])
          return (
            <li key={phase.id}>
              <div className="mb-2 flex items-center gap-3">
                <span className={clsx('grid size-8 place-items-center rounded-full text-sm font-bold', phaseDone ? 'bg-primary text-on-primary' : 'bg-surface-2 text-ink')}>
                  {phaseDone ? <Check className="size-4" /> : pi + 1}
                </span>
                <div className="flex-1">
                  <p className="font-bold text-ink">{phase.name} <span className="arabic text-base text-gold">{phase.arabic}</span></p>
                  <p className="text-xs text-muted">{phase.description}</p>
                </div>
              </div>
              <div className="space-y-2">
                {phase.items.map((item) => {
                  const state = checklist[item.id]
                  const trackable = item.trackingStage === 'tawaf' || item.trackingStage === 'sai'
                  return (
                    <Card key={item.id} className={clsx(state && 'opacity-80')}>
                      <div className="flex gap-3">
                        <button
                          aria-label={state ? 'Mark not done' : 'Mark done'}
                          onClick={() => toggleItem(item.id)}
                          className={clsx('mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border-2', state ? 'border-primary bg-primary text-on-primary' : 'border-line')}
                        >
                          {state && <Check className="size-4" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={clsx('font-semibold text-ink', state && 'line-through decoration-muted')}>{item.title}</p>
                            <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', typeStyle[item.type])}>{item.type}</span>
                          </div>
                          {item.arabic && <p className="arabic mt-1 text-right text-xl text-ink">{item.arabic}</p>}
                          {item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}
                          {state && <p className="mt-1 text-xs text-primary">{state.kind === 'tracked' ? 'Completed with live tracking' : 'Marked done'} · {new Date(state.at).toLocaleString()}</p>}
                          {trackable && !state && (
                            <Button
                              variant="secondary"
                              className="mt-2"
                              onClick={() => {
                                const stage = item.trackingStage as 'tawaf' | 'sai'
                                if (!session) start(stage, { source: 'checklist', checklistItemId: item.id })
                                navigate(`/ritual/track/${session?.stage ?? stage}`)
                              }}
                            >
                              <MapPin className="size-4" /> Track with GPS
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ol>

      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} title="Start over?">
        <p className="text-muted">This clears your Umrah checklist progress and starts fresh.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setResetOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => { resetChecklist(); setResetOpen(false) }}>Start over</Button>
        </div>
      </Sheet>
    </Page>
  )
}
