import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card, Notice, Page, PageHeader, Spinner } from '../../components/ui'
import { load, save } from '../../lib/storage'

type Name = { number: number; name: string; transliteration: string; meaning: string }

// Aladhan's Asma-ul-Husna endpoint (free, no key), cached on the device.
async function fetchNames(): Promise<Name[]> {
  const cached = load<Name[] | null>('asma_ul_husna_v1', null)
  if (cached?.length === 99) return cached
  const res = await fetch('https://api.aladhan.com/v1/asmaAlHusna')
  const j = await res.json()
  const names: Name[] = j.data.map((n: { number: number; name: string; transliteration: string; en: { meaning: string } }) => ({
    number: n.number,
    name: n.name,
    transliteration: n.transliteration,
    meaning: n.en.meaning,
  }))
  save('asma_ul_husna_v1', names)
  return names
}

export function NamesScreen() {
  const [names, setNames] = useState<Name[] | null>(null)
  const [error, setError] = useState(false)
  const [q, setQ] = useState('')
  useEffect(() => {
    fetchNames().then(setNames).catch(() => setError(true))
  }, [])
  const shown = (names ?? []).filter((n) => `${n.transliteration} ${n.meaning}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <Page>
      <PageHeader title="99 Names of Allah" subtitle="Asma-ul-Husna · أسماء الله الحسنى" />
      <div className="relative mb-3">
        <Search className="absolute top-3 left-3 size-5 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or meaning" className="w-full rounded-full border border-line bg-surface py-2.5 pr-3 pl-10 text-ink outline-none focus:border-primary" />
      </div>
      {error && !names && <Notice tone="error">Could not load the names. Check your connection and try again.</Notice>}
      {!names && !error && <Spinner />}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {shown.map((n) => (
          <Card key={n.number} className="text-center">
            <p className="text-xs text-muted">{n.number}</p>
            <p className="arabic text-3xl text-gold" style={{ direction: 'rtl' }}>{n.name}</p>
            <p className="font-semibold text-ink">{n.transliteration}</p>
            <p className="text-xs text-muted">{n.meaning}</p>
          </Card>
        ))}
      </div>
    </Page>
  )
}
