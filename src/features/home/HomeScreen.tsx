import {
  BookOpen,
  CalendarClock,
  ChevronRight,
  Compass,
  Coins,
  Fingerprint,
  HandHeart,
  House,
  MapPin,
  Moon,
  Star,
  Sun,
} from 'lucide-react'
import clsx from 'clsx'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Page, Sheet } from '../../components/ui'
import { FeatureFlags } from '../../lib/featureFlags'
import { Announcements } from './Announcements'
import { preferredName, useAuth } from '../../store/auth'
import { useLocation } from '../../store/location'
import { NextPrayerChip } from '../prayer/NextPrayerChip'
import { UpcomingBookings } from '../orders/UpcomingBookings'

const tiles = [
  { title: 'Family', image: '/images/family_tile.jpg', to: '/family', soon: false },
  { title: 'Ritual', image: '/images/ritual.jpg', to: '/ritual', soon: false },
  { title: 'Food', image: '/images/food_tile.jpg', to: '/food', soon: !FeatureFlags.ordersEnabled },
  { title: 'Transport', image: '/images/transport_tile.jpg', to: '/transport', soon: !FeatureFlags.ordersEnabled },
]

export const services: { title: string; to: string; icon: ReactNode; color: string }[] = [
  { title: 'Quran', to: '/quran', icon: <BookOpen />, color: 'bg-green-700' },
  { title: 'Qibla', to: '/qibla', icon: <Compass />, color: 'bg-blue-600' },
  { title: 'Dua & checklist', to: '/dua', icon: <HandHeart />, color: 'bg-violet-500' },
  { title: 'Tasbih', to: '/tasbih', icon: <Fingerprint />, color: 'bg-indigo-600' },
  { title: 'Adhkar', to: '/adhkar', icon: <Sun />, color: 'bg-amber-600' },
  { title: '99 Names', to: '/names', icon: <Star />, color: 'bg-amber-500' },
  { title: 'Prayer Times', to: '/prayer', icon: <CalendarClock />, color: 'bg-emerald-600' },
  { title: 'Home Finder', to: '/home-finder', icon: <House />, color: 'bg-teal-600' },
  { title: 'Currency Exchange', to: '/currency', icon: <Coins />, color: 'bg-pink-500' },
  { title: 'Fasting Times', to: '/fasting', icon: <Moon />, color: 'bg-purple-600' },
]

export function HomeScreen() {
  const user = useAuth((s) => s.user)
  const place = useLocation((s) => s.place)
  const navigate = useNavigate()
  const [soonTitle, setSoonTitle] = useState<string | null>(null)
  const hijri = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())

  return (
    <Page>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#064e3b] via-[#065f46] to-black p-5 text-white">
        <p className="text-sm text-white/70">Assalamu Alaikum</p>
        <h1 className="mt-0.5 text-2xl font-bold">{preferredName(user)}</h1>
        <p className="mt-1 text-sm text-white/70">{hijri}</p>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-white/70">
          <MapPin className="size-4" /> {place.isFallback ? 'Location unavailable' : place.label}
        </p>
        <div className="mt-4">
          <NextPrayerChip />
        </div>
      </section>

      {FeatureFlags.ordersEnabled ? <UpcomingBookings /> : <Announcements />}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <button
            key={t.title}
            onClick={() => (t.soon ? setSoonTitle(t.title) : navigate(t.to))}
            aria-label={t.soon ? `${t.title}, coming soon` : t.title}
            className="group relative aspect-[0.9] overflow-hidden rounded-2xl text-left shadow-sm sm:aspect-[0.8]"
          >
            <img
              src={t.image}
              alt=""
              className={clsx(
                'absolute inset-0 size-full object-cover transition duration-300',
                t.soon ? 'scale-110 blur-[5px] grayscale' : 'group-hover:scale-105',
              )}
            />
            <span className={clsx('absolute inset-0', t.soon ? 'bg-black/45' : 'bg-gradient-to-t from-black/75 via-black/10 to-transparent')} />
            {t.soon ? (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <span className="text-lg font-bold text-white">{t.title}</span>
                <span className="rounded-full bg-[#eab308] px-2.5 py-0.5 text-xs font-extrabold text-[#064e3b]">Coming soon</span>
              </span>
            ) : (
              <span className="absolute bottom-3 left-3 text-lg font-bold text-white">{t.title}</span>
            )}
          </button>
        ))}
      </div>

      <h2 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-muted uppercase">All services</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {services.map((s) => (
          <button
            key={s.title}
            onClick={() => navigate(s.to)}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition hover:border-primary/50"
          >
            <span className={`grid size-10 place-items-center rounded-xl text-white [&>svg]:size-5 ${s.color}`}>{s.icon}</span>
            <span className="flex-1 font-medium text-ink">{s.title}</span>
            <ChevronRight className="size-5 text-muted" />
          </button>
        ))}
      </div>
      <Sheet open={soonTitle != null} onClose={() => setSoonTitle(null)} title={`${soonTitle ?? ''} coming soon`}>
        <p className="text-ink">
          We are focusing on Umrah, the ritual guide and the family tracker first. Ordering will be available in a later update.
        </p>
        <Button className="mt-4 w-full" onClick={() => setSoonTitle(null)}>OK</Button>
      </Sheet>
    </Page>
  )
}
