import clsx from 'clsx'
import { RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card, Page, PageHeader, Segmented, Spinner } from '../../components/ui'
import { load, save } from '../../lib/storage'
import { loadAdhkar, type Adhkar } from './duaRepo'

/** Morning & evening adhkar (Hisnul Muslim) with tap-to-count. */
export function AdhkarScreen() {
  const [items, setItems] = useState<Adhkar[] | null>(null)
  const [time, setTime] = useState<'morning' | 'evening'>(new Date().getHours() < 15 ? 'morning' : 'evening')
  const key = `adhkar_counts_${time}_${new Date().toISOString().slice(0, 10)}`
  const [counts, setCounts] = useState<Record<number, number>>(() => load(key, {}))
  useEffect(() => {
    // type: 0 = morning and evening, 1 = morning only, 2 = evening only.
    loadAdhkar()
      .then((all) => setItems(all.filter((a) => a.type === 0 || a.type === (time === 'morning' ? 1 : 2))))
      .catch(() => setItems([]))
  }, [time])
  useEffect(() => {
    setCounts(load(key, {}))
  }, [key])

  function tap(order: number, target: number) {
    const n = Math.min(target, (counts[order] ?? 0) + 1)
    const next = { ...counts, [order]: n }
    setCounts(next)
    save(key, next)
    try {
      navigator.vibrate?.(n === target ? [60, 40, 60] : 15)
    } catch {
      // unsupported
    }
  }

  const done = items ? items.filter((a) => (counts[a.order] ?? 0) >= a.count).length : 0
  return (
    <Page>
      <PageHeader
        title="Adhkar"
        subtitle={items ? `${done} of ${items.length} done today` : 'Hisnul Muslim'}
        action={
          <button aria-label="Reset counts" onClick={() => { setCounts({}); save(key, {}) }} className="grid size-10 place-items-center rounded-full border border-line bg-surface">
            <RotateCcw className="size-5" />
          </button>
        }
      />
      <Segmented value={time} onChange={setTime} options={[{ value: 'morning', label: '☀️ Morning' }, { value: 'evening', label: '🌙 Evening' }]} />
      <div className="mt-3 space-y-2">
        {!items ? (
          <Spinner />
        ) : (
          items.map((a) => {
            const c = counts[a.order] ?? 0
            const complete = c >= a.count
            return (
              <Card key={a.order} onClick={() => tap(a.order, a.count)} className={clsx(complete && 'border-primary/60 bg-primary/5')}>
                <p className="arabic text-right text-2xl leading-loose text-ink">{a.content}</p>
                <p className="mt-1 text-sm text-ink italic">{a.transliteration}</p>
                <p className="mt-1 text-sm text-muted">{a.translation}</p>
                {a.fadl && <p className="mt-2 rounded-lg bg-gold-soft p-2 text-xs text-ink">{a.fadl}</p>}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-muted">{a.source}</span>
                  <span className={clsx('rounded-full px-3 py-1 text-sm font-bold tabular-nums', complete ? 'bg-primary text-on-primary' : 'bg-surface-2 text-ink')}>
                    {c} / {a.count}
                  </span>
                </div>
              </Card>
            )
          })
        )}
      </div>
      <p className="mt-3 text-center text-xs text-muted">Tap a card to count. Counts reset each day.</p>
    </Page>
  )
}
