import { Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLocation } from '../../store/location'
import { useSettings } from '../../store/settings'
import { formatCountdown, formatTime, nextPrayer, useTimings } from './prayerTimes'

export function usePrayerData() {
  const place = useLocation((s) => s.place)
  const { calcMethod, asrSchool } = useSettings()
  const timings = useTimings()
  useEffect(() => {
    timings.refresh(place.lat, place.lng, calcMethod, asrSchool)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place.lat, place.lng, calcMethod, asrSchool])
  return timings
}

export function NextPrayerChip() {
  const { today } = usePrayerData()
  const use24h = useSettings((s) => s.use24h)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  if (!today) return null
  const next = nextPrayer(today, now)
  return (
    <Link to="/prayer" className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm backdrop-blur hover:bg-white/25">
      <Clock className="size-4" />
      {next ? (
        <span>
          {next.name} at {formatTime(today.timings[next.name], use24h)} · in {formatCountdown(next.at.getTime() - now.getTime())}
        </span>
      ) : (
        <span>Fajr tomorrow · Isha was {formatTime(today.timings.Isha, use24h)}</span>
      )}
    </Link>
  )
}
