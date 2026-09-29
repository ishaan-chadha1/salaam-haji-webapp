import clsx from 'clsx'
import { Bell, BellOff, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, Card, Notice, Page, PageHeader, Spinner } from '../../components/ui'
import { load, save } from '../../lib/storage'
import { useLocation } from '../../store/location'
import { useSettings } from '../../store/settings'
import { usePrayerData } from './NextPrayerChip'
import { atTime, formatCountdown, formatTime, nextPrayer, PRAYERS } from './prayerTimes'

let reminderTimers: ReturnType<typeof setTimeout>[] = []

/** While the app is open, alerts at each prayer time (the web has no offline scheduled alarms). */
export function scheduleReminders(timings: Record<string, string>) {
  reminderTimers.forEach(clearTimeout)
  reminderTimers = []
  if (!load('prayer_reminders', false) || typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const now = Date.now()
  for (const name of PRAYERS) {
    if (name === 'Sunrise') continue
    const at = atTime(new Date(), timings[name]).getTime()
    if (at > now) reminderTimers.push(setTimeout(() => new Notification(`Time for ${name}`, { body: `It's ${timings[name]}.`, icon: '/icons/icon-192.png' }), at - now))
  }
}

export function PrayerScreen() {
  const { today, error, loading } = usePrayerData()
  const { place, locate, status } = useLocation()
  const use24h = useSettings((s) => s.use24h)
  const [now, setNow] = useState(new Date())
  const [reminders, setReminders] = useState(() => load('prayer_reminders', false))
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    if (today) scheduleReminders(today.timings)
  }, [today, reminders])
  const next = today ? nextPrayer(today, now) : null

  async function toggleReminders() {
    if (!reminders && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      if ((await Notification.requestPermission()) !== 'granted') return
    }
    save('prayer_reminders', !reminders)
    setReminders(!reminders)
  }

  return (
    <Page>
      <PageHeader title="Prayer times" subtitle={today ? `${today.hijri.day} ${today.hijri.month} ${today.hijri.year} AH` : undefined} />
      {next && today && (
        <Card className="mb-3 bg-gradient-to-br from-[#064e3b] to-[#065f46] text-center text-white">
          <p className="text-sm text-white/70">Next prayer</p>
          <p className="text-3xl font-bold">{next.name}</p>
          <p className="text-lg">{formatTime(today.timings[next.name], use24h)}</p>
          <p className="mt-1 text-sm text-white/80">in {formatCountdown(next.at.getTime() - now.getTime())}</p>
        </Card>
      )}
      {loading && !today && <Spinner />}
      {error && <Notice tone="error">{error}</Notice>}
      {today && (
        <Card className="divide-y divide-line p-0">
          {PRAYERS.map((p) => (
            <div key={p} className={clsx('flex items-center justify-between px-4 py-3', next?.name === p && 'bg-primary/10')}>
              <span className={clsx('font-medium', next?.name === p ? 'text-primary' : 'text-ink')}>{p}</span>
              <span className="font-semibold text-ink tabular-nums">{formatTime(today.timings[p], use24h)}</span>
            </div>
          ))}
        </Card>
      )}
      <div className="mt-3 space-y-2">
        <Card className="flex items-center gap-3">
          <MapPin className="size-5 text-primary" />
          <p className="flex-1 text-sm text-ink">{place.label}</p>
          <Button variant="secondary" onClick={locate} loading={status === 'locating'}>Update</Button>
        </Card>
        <Card className="flex items-center gap-3">
          {reminders ? <Bell className="size-5 text-primary" /> : <BellOff className="size-5 text-muted" />}
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">Prayer alerts</p>
            <p className="text-xs text-muted">Shown while Salaam Haji is open in a tab or installed window.</p>
          </div>
          <Button variant="secondary" onClick={toggleReminders}>{reminders ? 'Turn off' : 'Turn on'}</Button>
        </Card>
        <p className="text-center text-xs text-muted">Calculation method and Asr time are in Settings.</p>
      </div>
    </Page>
  )
}
