import clsx from 'clsx'
import { Bookmark, ChevronLeft, ChevronRight, Pause, Play, Settings2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Notice, Page, PageHeader, Sheet, Spinner } from '../../components/ui'
import { useSettings } from '../../store/settings'
import { ayahAudio, fetchSurah, getBookmarks, setLastRead, toggleBookmark, type SurahText } from './quranApi'

export function SurahScreen() {
  const { surah } = useParams()
  const n = Math.min(114, Math.max(1, Number(surah) || 1))
  const navigate = useNavigate()
  const { quranFontSize, showTranslation, set } = useSettings()
  const [showTranslit, setShowTranslit] = useState(() => localStorage.getItem('quran_translit') === '1')
  const [data, setData] = useState<SurahText | null>(null)
  const [error, setError] = useState(false)
  const [marks, setMarks] = useState(() => new Set(getBookmarks().map((b) => b.globalNumber)))
  const [playing, setPlaying] = useState<number | null>(null)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    setData(null)
    setError(false)
    fetchSurah(n).then(setData).catch(() => setError(true))
    return () => audio.current?.pause()
  }, [n])

  // Jump to #ayah-N, then remember the last ayah that scrolled into view.
  useEffect(() => {
    if (!data) return
    const hash = window.location.hash
    if (hash) document.querySelector(hash)?.scrollIntoView({ block: 'start' })
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).map((e) => Number((e.target as HTMLElement).dataset.ayah))[0]
        if (top) setLastRead({ surah: n, surahName: data.meta.englishName, ayah: top })
      },
      { rootMargin: '0px 0px -70% 0px' },
    )
    document.querySelectorAll('[data-ayah]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [data, n])

  function play(i: number) {
    if (!data) return
    if (playing === i) {
      audio.current?.pause()
      setPlaying(null)
      return
    }
    audio.current?.pause()
    const a = new Audio(ayahAudio(data.ayahs[i].number))
    audio.current = a
    setPlaying(i)
    a.play().catch(() => setPlaying(null))
    // Continue to the next ayah, like a recitation.
    a.onended = () => (i + 1 < data.ayahs.length ? play(i + 1) : setPlaying(null))
    document.getElementById(`ayah-${data.ayahs[i].numberInSurah}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <Page>
      <PageHeader
        title={data?.meta.englishName ?? `Surah ${n}`}
        subtitle={data ? `${data.meta.englishNameTranslation} · ${data.meta.numberOfAyahs} ayahs` : undefined}
        action={
          <button aria-label="Reading options" onClick={() => setOptionsOpen(true)} className="grid size-10 place-items-center rounded-full border border-line bg-surface">
            <Settings2 className="size-5" />
          </button>
        }
      />
      {error && <Notice tone="error">Could not load this surah. It will be available offline once you've opened it with a connection.</Notice>}
      {!data && !error && <Spinner />}
      {data && (
        <>
          <Card className="mb-3 bg-gradient-to-br from-[#064e3b] to-[#065f46] text-center text-white">
            <p className="arabic text-4xl text-[#eab308]">{data.meta.name}</p>
            {n !== 1 && n !== 9 && <p className="arabic mt-2 text-2xl">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>}
          </Card>
          <div className="space-y-2">
            {data.ayahs.map((a, i) => {
              const marked = marks.has(a.number)
              return (
                <Card key={a.number} className={clsx(playing === i && 'border-primary bg-primary/5')}>
                  <div id={`ayah-${a.numberInSurah}`} data-ayah={a.numberInSurah} className="scroll-mt-4">
                    <div className="mb-2 flex items-center gap-1">
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">{n}:{a.numberInSurah}</span>
                      <span className="flex-1" />
                      <button aria-label={playing === i ? 'Pause' : 'Play'} onClick={() => play(i)} className="grid size-8 place-items-center rounded-full text-primary hover:bg-surface-2">
                        {playing === i ? <Pause className="size-4" /> : <Play className="size-4" />}
                      </button>
                      <button
                        aria-label={marked ? 'Remove bookmark' : 'Bookmark'}
                        onClick={() => {
                          toggleBookmark({ surah: n, surahName: data.meta.englishName, ayah: a.numberInSurah, globalNumber: a.number })
                          setMarks(new Set(getBookmarks().map((b) => b.globalNumber)))
                        }}
                        className="grid size-8 place-items-center rounded-full text-gold hover:bg-surface-2"
                      >
                        <Bookmark className={clsx('size-4', marked && 'fill-current')} />
                      </button>
                    </div>
                    <p className="arabic text-right text-ink" style={{ fontSize: quranFontSize, lineHeight: 2.1 }}>
                      {a.arabic} <span className="text-gold">﴿{a.numberInSurah.toLocaleString('ar-EG')}﴾</span>
                    </p>
                    {showTranslit && <p className="mt-2 text-sm text-ink italic">{a.transliteration}</p>}
                    {showTranslation && <p className="mt-2 text-muted">{a.translation}</p>}
                  </div>
                </Card>
              )
            })}
          </div>
          <div className="mt-4 flex justify-between">
            <Button variant="secondary" disabled={n <= 1} onClick={() => navigate(`/quran/${n - 1}`)}><ChevronLeft className="size-4" /> Previous</Button>
            <Button variant="secondary" disabled={n >= 114} onClick={() => navigate(`/quran/${n + 1}`)}>Next <ChevronRight className="size-4" /></Button>
          </div>
        </>
      )}

      <Sheet open={optionsOpen} onClose={() => setOptionsOpen(false)} title="Reading options">
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm text-muted">Arabic size · {quranFontSize}px</span>
            <input type="range" min={20} max={48} value={quranFontSize} onChange={(e) => set({ quranFontSize: Number(e.target.value) })} className="w-full accent-[var(--primary)]" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-ink">Translation (Sahih International)</span>
            <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={showTranslation} onChange={(e) => set({ showTranslation: e.target.checked })} />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-ink">Transliteration</span>
            <input
              type="checkbox"
              className="size-5 accent-[var(--primary)]"
              checked={showTranslit}
              onChange={(e) => {
                setShowTranslit(e.target.checked)
                try {
                  localStorage.setItem('quran_translit', e.target.checked ? '1' : '0')
                } catch {
                  // ignore
                }
              }}
            />
          </label>
        </div>
      </Sheet>
    </Page>
  )
}
