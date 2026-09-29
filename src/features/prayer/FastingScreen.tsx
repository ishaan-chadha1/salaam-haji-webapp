import { Moon, Sunrise } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card, Notice, Page, PageHeader, Spinner } from '../../components/ui'
import { useLocation } from '../../store/location'
import { useSettings } from '../../store/settings'
import { fetchTimings, formatTime, type DayTimings } from './prayerTimes'

/** Sahur (Imsak/Fajr) and Iftar (Maghrib) for the next week, plus the White Days. */
export function FastingScreen() {
  const place = useLocation((s) => s.place)
  const { calcMethod, asrSchool, use24h } = useSettings()
  const [days, setDays] = useState<DayTimings[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + i)
      return d
    })
    Promise.all(dates.map((d) => fetchTimings(d, place.lat, place.lng, calcMethod, asrSchool)))
      .then(setDays)
      .catch(() => setError('Could not load fasting times. Check your connection.'))
  }, [place.lat, place.lng, calcMethod, asrSchool])

  const today = days?.[0]
  return (
    <Page>
      <PageHeader title="Fasting times" subtitle={place.label} />
      {error && <Notice tone="error">{error}</Notice>}
      {!days && !error && <Spinner label="Loading fasting times…" />}
      {today && (
        <div className="grid grid-cols-2 gap-2">
          <Card className="text-center">
            <Sunrise className="mx-auto size-7 text-gold" />
            <p className="mt-1 text-sm text-muted">Sahur ends</p>
            <p className="text-2xl font-bold text-ink">{formatTime(today.timings.Imsak, use24h)}</p>
            <p className="text-xs text-muted">Fajr {formatTime(today.timings.Fajr, use24h)}</p>
          </Card>
          <Card className="text-center">
            <Moon className="mx-auto size-7 text-gold" />
            <p className="mt-1 text-sm text-muted">Iftar</p>
            <p className="text-2xl font-bold text-ink">{formatTime(today.timings.Maghrib, use24h)}</p>
            <p className="text-xs text-muted">Maghrib</p>
          </Card>
        </div>
      )}
      {days && (
        <Card className="mt-3 divide-y divide-line p-0">
          {days.map((d) => (
            <div key={d.date} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-ink">
                {new Date(d.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                <span className="block text-xs text-muted">{d.hijri.day} {d.hijri.month}{[13, 14, 15].includes(d.hijri.day) ? ' · White Day' : ''}</span>
              </span>
              <span className="text-right text-ink tabular-nums">
                {formatTime(d.timings.Imsak, use24h)} – {formatTime(d.timings.Maghrib, use24h)}
              </span>
            </div>
          ))}
        </Card>
      )}
      <Card className="mt-3">
        <p className="font-semibold text-ink">White Days (recommended fasting)</p>
        <p className="mt-1 text-sm text-muted">The 13th, 14th and 15th of every Hijri month.</p>
        <div className="mt-2 flex gap-2">
          {['13th', '14th', '15th'].map((d) => (
            <span key={d} className="rounded-full bg-gold-soft px-3 py-1 text-sm font-semibold text-ink">{d}</span>
          ))}
        </div>
      </Card>
    </Page>
  )
}
