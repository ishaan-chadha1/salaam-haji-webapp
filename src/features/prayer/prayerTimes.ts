import { create } from 'zustand'
import { load, save } from '../../lib/storage'

// Prayer times from Aladhan (the Flutter app's legacy source; free, no key).

export const PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const
export type PrayerName = (typeof PRAYERS)[number]

export type DayTimings = {
  date: string // yyyy-mm-dd (local)
  timings: Record<PrayerName | 'Imsak' | 'Midnight', string> // "HH:mm"
  hijri: { day: number; month: string; monthNumber: number; year: number; weekday: string }
  gregorian: string
}

export const CALC_METHODS: { id: number; name: string }[] = [
  { id: 4, name: 'Umm al-Qura, Makkah' },
  { id: 3, name: 'Muslim World League' },
  { id: 2, name: 'ISNA (North America)' },
  { id: 5, name: 'Egyptian General Authority' },
  { id: 1, name: 'University of Islamic Sciences, Karachi' },
  { id: 8, name: 'Gulf Region' },
  { id: 9, name: 'Kuwait' },
  { id: 10, name: 'Qatar' },
  { id: 11, name: 'Singapore (MUIS)' },
  { id: 13, name: 'Diyanet, Turkey' },
  { id: 15, name: 'Moonsighting Committee' },
]

export function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export async function fetchTimings(date: Date, lat: number, lng: number, method: number, school: number): Promise<DayTimings> {
  const key = `timings_${ymd(date)}_${lat.toFixed(2)}_${lng.toFixed(2)}_${method}_${school}`
  const cached = load<DayTimings | null>(key, null)
  if (cached) return cached
  const dd = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`
  const res = await fetch(`https://api.aladhan.com/v1/timings/${dd}?latitude=${lat}&longitude=${lng}&method=${method}&school=${school}`)
  if (!res.ok) throw new Error('Could not load prayer times')
  const j = (await res.json()).data
  const strip = (s: string) => s.slice(0, 5)
  const t = j.timings
  const out: DayTimings = {
    date: ymd(date),
    timings: {
      Imsak: strip(t.Imsak),
      Fajr: strip(t.Fajr),
      Sunrise: strip(t.Sunrise),
      Dhuhr: strip(t.Dhuhr),
      Asr: strip(t.Asr),
      Maghrib: strip(t.Maghrib),
      Isha: strip(t.Isha),
      Midnight: strip(t.Midnight),
    },
    hijri: {
      day: Number(j.date.hijri.day),
      month: j.date.hijri.month.en,
      monthNumber: j.date.hijri.month.number,
      year: Number(j.date.hijri.year),
      weekday: j.date.hijri.weekday.en,
    },
    gregorian: j.date.readable,
  }
  save(key, out)
  return out
}

/** "HH:mm" on [day] as a Date. */
export function atTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(day)
  d.setHours(h, m, 0, 0)
  return d
}

export function formatTime(hhmm: string, use24h: boolean): string {
  if (use24h) return hhmm
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`
}

export function nextPrayer(t: DayTimings, now = new Date()): { name: PrayerName; at: Date } | null {
  for (const name of PRAYERS) {
    if (name === 'Sunrise') continue
    const at = atTime(now, t.timings[name])
    if (at > now) return { name, at }
  }
  return null
}

export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

type TimingsState = {
  today: DayTimings | null
  error: string | null
  loading: boolean
  refresh: (lat: number, lng: number, method: number, school: number) => Promise<void>
}

export const useTimings = create<TimingsState>((set) => ({
  today: null,
  error: null,
  loading: false,
  refresh: async (lat, lng, method, school) => {
    set({ loading: true, error: null })
    try {
      set({ today: await fetchTimings(new Date(), lat, lng, method, school), loading: false })
    } catch {
      set({ error: 'Could not load prayer times. Check your connection and try again.', loading: false })
    }
  },
}))
