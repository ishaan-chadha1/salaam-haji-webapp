import { Footprints, RotateCw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, Empty, Page, PageHeader, Sheet } from '../../components/ui'
import { formatDistance } from '../../lib/geo'
import { HistoryRing } from './components/HistoryRing'
import { formatDuration, stageLabel, useRitual } from './ritualStore'

export function HistoryScreen() {
  const { history, clearHistory } = useRitual()
  const [confirm, setConfirm] = useState(false)
  return (
    <Page>
      <PageHeader
        title="Ritual history"
        subtitle="Saved on this device"
        action={
          history.length > 0 && (
            <button aria-label="Clear history" onClick={() => setConfirm(true)} className="grid size-10 place-items-center rounded-full border border-line bg-surface text-danger">
              <Trash2 className="size-5" />
            </button>
          )
        }
      />
      {history.length === 0 ? (
        <Empty icon={<RotateCw className="size-10" />} title="No rituals yet">Completed Tawaf and Sa'i appear here.</Empty>
      ) : (
        <div className="space-y-2">
          {history.map((h) => (
            <Card key={h.id}>
              <div className="flex gap-3">
                {h.route && h.tawafSite && h.route.length >= 4 ? (
                  <HistoryRing route={h.route} site={h.tawafSite} />
                ) : (
                  <div className="grid size-[88px] shrink-0 place-items-center rounded-xl bg-surface-2 text-primary">
                    <Footprints className="size-8" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-ink">{stageLabel(h.stage)}</p>
                    {h.isDemo && <span className="rounded-full bg-gold-soft px-2 text-[10px] font-bold text-ink uppercase">Demo</span>}
                    {h.completion === 'manualMode' && <span className="rounded-full bg-surface-2 px-2 text-[10px] font-bold text-muted uppercase">Marked</span>}
                  </div>
                  <p className="text-xs text-muted">{new Date(h.startTime).toLocaleString()}</p>
                  <p className="mt-1 text-sm text-ink">
                    {h.laps} {h.stage === 'tawaf' ? 'laps' : 'trips'} · {formatDuration(h.durationMs)} · {formatDistance(h.distance)} · {h.steps.toLocaleString()} steps
                  </p>
                  {h.checklistItemTitle && <p className="text-xs text-primary">From Umrah checklist</p>}
                  {h.journal && <p className="mt-1 line-clamp-2 text-sm text-muted italic">“{h.journal}”</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Clear history?">
        <p className="text-muted">This removes all saved rituals from this device.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => { clearHistory(); setConfirm(false) }}>Clear</Button>
        </div>
      </Sheet>
    </Page>
  )
}
