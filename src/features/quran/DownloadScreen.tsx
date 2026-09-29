import { CheckCircle2, Download } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button, Card, Notice, Page, PageHeader } from '../../components/ui'
import { load, save } from '../../lib/storage'
import { fetchSurahList, surahUrl } from './quranApi'

/** Warms the service-worker cache with all 114 surahs so the Quran reads offline. */
export function DownloadScreen() {
  const [done, setDone] = useState(() => load<number>('quran_offline_count', 0))
  const [running, setRunning] = useState(false)
  const [failed, setFailed] = useState(0)
  const stop = useRef(false)

  async function start() {
    setRunning(true)
    setFailed(0)
    stop.current = false
    await fetchSurahList().catch(() => {})
    let ok = 0
    let bad = 0
    for (let n = 1; n <= 114 && !stop.current; n++) {
      try {
        const r = await fetch(surahUrl(n))
        if (!r.ok) throw new Error()
        await r.arrayBuffer()
        ok++
      } catch {
        bad++
      }
      setDone(ok)
      setFailed(bad)
    }
    save('quran_offline_count', ok)
    setRunning(false)
  }

  const pct = Math.round((done / 114) * 100)
  return (
    <Page>
      <PageHeader title="Offline Quran" subtitle="Read without a connection" />
      <Card>
        <div className="flex items-center gap-3">
          {done === 114 ? <CheckCircle2 className="size-10 text-primary" /> : <Download className="size-10 text-primary" />}
          <div className="flex-1">
            <p className="font-bold text-ink">{done === 114 ? 'The whole Quran is saved' : `${done} of 114 surahs saved`}</p>
            <p className="text-sm text-muted">Arabic, transliteration and English translation (about 6 MB).</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 flex gap-2">
          {running ? (
            <Button variant="secondary" onClick={() => (stop.current = true)}>Stop</Button>
          ) : (
            <Button onClick={start}>{done === 114 ? 'Download again' : done > 0 ? 'Continue download' : 'Download'}</Button>
          )}
        </div>
      </Card>
      {failed > 0 && !running && <div className="mt-3"><Notice tone="warn">{failed} surahs could not be downloaded. Try again on a better connection.</Notice></div>}
      <p className="mt-3 text-center text-xs text-muted">Recitation audio streams online and is not saved.</p>
    </Page>
  )
}
