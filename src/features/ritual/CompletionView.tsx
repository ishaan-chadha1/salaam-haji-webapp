import { BookHeart, PartyPopper } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Page } from '../../components/ui'
import { formatDistance } from '../../lib/geo'
import { HistoryRing } from './components/HistoryRing'
import { formatDuration, stageLabel, useRitual } from './ritualStore'

/** Completion celebration (completion_celebration_screen.dart). */
export function CompletionView() {
  const navigate = useNavigate()
  const { completed, saveJournal, dismissCompletion } = useRitual()
  const [journal, setJournal] = useState(completed?.journal ?? '')
  const [saved, setSaved] = useState(false)
  if (!completed) return null
  const c = completed
  const unit = c.stage === 'tawaf' ? 'Laps' : 'Trips'

  return (
    <Page>
      <div className="rounded-3xl bg-gradient-to-br from-[#064e3b] via-[#065f46] to-black p-6 text-center text-white">
        <PartyPopper className="mx-auto size-12 text-[#eab308]" />
        <h1 className="mt-2 text-3xl font-bold">Congratulations!</h1>
        <p className="mt-1 text-white/80">You have completed your {stageLabel(c.stage)}{c.isDemo ? ' (demo)' : ''}</p>
        <p className="arabic mt-2 text-2xl text-[#eab308]">تَقَبَّلَ اللَّهُ مِنَّا وَمِنْكُمْ</p>
        <p className="text-sm text-white/70">May Allah accept it from us and from you</p>
      </div>

      <Card className="mt-4">
        <p className="mb-3 font-bold text-ink">Session summary</p>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Summary label="Duration" value={formatDuration(c.durationMs)} />
          <Summary label="Steps" value={c.steps.toLocaleString()} />
          <Summary label="Distance" value={formatDistance(c.distance)} />
          <Summary label={unit} value={`${c.laps}`} />
        </div>
        {c.route && c.tawafSite && c.route.length >= 4 && (
          <div className="mt-4 flex justify-center">
            <HistoryRing route={c.route} site={c.tawafSite} size={160} />
          </div>
        )}
      </Card>

      {c.lapDurationsMs.length > 0 && (
        <Card className="mt-3">
          <p className="mb-2 font-bold text-ink">{c.stage === 'tawaf' ? 'Lap' : 'Trip'} timeline</p>
          <div className="space-y-1.5">
            {c.lapDurationsMs.map((ms, i) => {
              const max = Math.max(...c.lapDurationsMs)
              return (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-12 text-muted">#{i + 1}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${(ms / max) * 100}%` }} />
                  </div>
                  <span className="w-14 text-right text-ink tabular-nums">{formatDuration(ms)}</span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <Card className="mt-3">
        <p className="flex items-center gap-2 font-bold text-ink"><BookHeart className="size-5 text-gold" /> Spiritual journal</p>
        <textarea
          value={journal}
          onChange={(e) => { setJournal(e.target.value); setSaved(false) }}
          placeholder="How did it feel? What did you pray for?"
          rows={4}
          className="mt-2 w-full rounded-xl border border-line bg-surface p-3 text-ink outline-none focus:border-primary"
        />
        <Button variant="secondary" className="mt-2" onClick={() => { saveJournal(journal); setSaved(true) }} disabled={saved || !journal.trim()}>
          {saved ? 'Saved' : 'Save to history'}
        </Button>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => { dismissCompletion(); navigate('/ritual/history') }}>View history</Button>
        <Button onClick={() => { if (journal.trim() && !saved) saveJournal(journal); dismissCompletion(); navigate('/') }}>Return to home</Button>
      </div>
    </Page>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-bold text-ink tabular-nums">{value}</p>
    </div>
  )
}
