import { ChevronRight, Footprints, Landmark, MessageCircle, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

/** Placeholder slides while ordering is paused (same as the phone app's Home
 *  carousel). Replace with real announcements later. */
const SLIDES: { label: string; title: string; body: string; icon: ReactNode; to: string }[] = [
  { label: 'Welcome', title: 'Your Umrah, step by step', body: 'Guidance for every rite, from Ihram to Halq.', icon: <Landmark />, to: '/ritual' },
  { label: 'New', title: 'Try a guided Tawaf', body: 'Ritual → Demo mode: watch 7 laps counted live.', icon: <Footprints />, to: '/ritual' },
  { label: 'Family', title: 'Stay close to your group', body: 'Share your location and saved places with family.', icon: <Users />, to: '/family' },
  { label: 'Ask', title: 'Digital Mutawwif', body: 'Ask any question about Umrah and get an answer with sources.', icon: <MessageCircle />, to: '/chat' },
]

export function Announcements() {
  const navigate = useNavigate()
  const [active, setActive] = useState(0)
  return (
    <section className="mt-5">
      <div
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
        onScroll={(e) => {
          const el = e.currentTarget
          const card = el.firstElementChild as HTMLElement | null
          if (card) setActive(Math.round(el.scrollLeft / (card.offsetWidth + 12)))
        }}
      >
        {SLIDES.map((s) => (
          <button
            key={s.title}
            onClick={() => navigate(s.to)}
            className="flex w-[85%] max-w-md shrink-0 snap-start items-center gap-3 rounded-2xl border border-[#eab308]/40 bg-gradient-to-br from-[#064e3b] to-[#022c22] p-4 text-left text-white sm:w-[48%]"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#eab308]/20 text-[#eab308] [&>svg]:size-6">{s.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-extrabold tracking-wider text-[#eab308] uppercase">{s.label}</span>
              <span className="block truncate text-base font-bold">{s.title}</span>
              <span className="line-clamp-2 block text-sm text-white/80">{s.body}</span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-white/50" />
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
        {SLIDES.map((s, i) => (
          <span key={s.title} className={`h-1.5 rounded-full transition-all ${i === active ? 'w-5 bg-primary' : 'w-1.5 bg-line'}`} />
        ))}
      </div>
    </section>
  )
}
