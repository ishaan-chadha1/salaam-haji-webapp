import { Bookmark, BookOpen, Download, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Notice, Page, PageHeader, Spinner } from '../../components/ui'
import { fetchSurahList, getLastRead, type SurahMeta } from './quranApi'

export function QuranScreen() {
  const navigate = useNavigate()
  const [list, setList] = useState<SurahMeta[] | null>(null)
  const [error, setError] = useState(false)
  const [q, setQ] = useState('')
  const last = getLastRead()
  useEffect(() => {
    fetchSurahList().then(setList).catch(() => setError(true))
  }, [])
  const shown = (list ?? []).filter((s) => `${s.number} ${s.englishName} ${s.englishNameTranslation}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <Page>
      <PageHeader
        title="Quran"
        subtitle="القرآن الكريم"
        action={
          <div className="flex gap-2">
            <button aria-label="Bookmarks" onClick={() => navigate('/bookmarks')} className="grid size-10 place-items-center rounded-full border border-line bg-surface"><Bookmark className="size-5" /></button>
            <button aria-label="Offline Quran" onClick={() => navigate('/download')} className="grid size-10 place-items-center rounded-full border border-line bg-surface"><Download className="size-5" /></button>
          </div>
        }
      />
      {last && (
        <Card onClick={() => navigate(`/quran/${last.surah}#ayah-${last.ayah}`)} className="mb-3 bg-gradient-to-br from-[#064e3b] to-[#065f46] text-white">
          <p className="flex items-center gap-2 text-sm text-white/70"><BookOpen className="size-4" /> Continue reading</p>
          <p className="text-lg font-bold">{last.surahName} · Ayah {last.ayah}</p>
        </Card>
      )}
      <div className="relative mb-3">
        <Search className="absolute top-3 left-3 size-5 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search surah" className="w-full rounded-full border border-line bg-surface py-2.5 pr-3 pl-10 text-ink outline-none focus:border-primary" />
      </div>
      {error && !list && <Notice tone="error">Could not load the surah list. Check your connection.</Notice>}
      {!list && !error && <Spinner />}
      <div className="grid gap-2 sm:grid-cols-2">
        {shown.map((s) => (
          <button key={s.number} onClick={() => navigate(`/quran/${s.number}`)} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition hover:border-primary/50">
            <span className="grid size-10 shrink-0 rotate-45 place-items-center rounded-lg border-2 border-gold">
              <span className="-rotate-45 text-sm font-bold text-ink">{s.number}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">{s.englishName}</span>
              <span className="block truncate text-xs text-muted">{s.englishNameTranslation} · {s.numberOfAyahs} ayahs · {s.revelationType}</span>
            </span>
            <span className="arabic text-xl text-gold">{s.name.replace('سُورَةُ ', '')}</span>
          </button>
        ))}
      </div>
    </Page>
  )
}
