import { ArrowDownUp, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, Card, Notice, Page, PageHeader, Spinner } from '../../components/ui'
import { load, save } from '../../lib/storage'

type Rates = { rates: Record<string, number>; updated: number }

/** Live rates from open.er-api.com (currency_exchange_screen.dart), cached for offline use. */
export function CurrencyScreen() {
  const [data, setData] = useState<Rates | null>(() => load<Rates | null>('fx_rates_v1', null))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState('1')
  const [from, setFrom] = useState(() => load('fx_from', 'USD'))
  const [to, setTo] = useState(() => load('fx_to', 'SAR'))

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const j = await (await fetch('https://open.er-api.com/v6/latest/USD')).json()
      const next = { rates: j.rates as Record<string, number>, updated: Date.now() }
      setData(next)
      save('fx_rates_v1', next)
    } catch {
      setError('Failed to fetch live exchange rates. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (!data || Date.now() - data.updated > 6 * 3600 * 1000) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    save('fx_from', from)
    save('fx_to', to)
  }, [from, to])

  const codes = data ? Object.keys(data.rates).sort() : []
  const value = data ? (Number(amount) || 0) * (data.rates[to] / data.rates[from]) : 0
  const quick = ['USD', 'GBP', 'EUR', 'INR', 'PKR', 'SAR', 'AED']

  return (
    <Page>
      <PageHeader
        title="Currency exchange"
        subtitle={data ? `Updated ${new Date(data.updated).toLocaleString()}` : undefined}
        action={
          <button aria-label="Refresh rates" onClick={refresh} className="grid size-10 place-items-center rounded-full border border-line bg-surface">
            <RefreshCw className={`size-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />
      {error && <Notice tone="error">{error}</Notice>}
      {!data && loading && <Spinner />}
      {data && (
        <Card className="space-y-3">
          <CurrencyRow codes={codes} code={from} onCode={setFrom}>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} className="w-full bg-transparent text-3xl font-bold text-ink outline-none" aria-label="Amount" />
          </CurrencyRow>
          <div className="flex justify-center">
            <Button variant="secondary" aria-label="Swap" onClick={() => { setFrom(to); setTo(from) }}><ArrowDownUp className="size-4" /></Button>
          </div>
          <CurrencyRow codes={codes} code={to} onCode={setTo}>
            <p className="text-3xl font-bold text-primary tabular-nums">{value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </CurrencyRow>
          <p className="text-center text-sm text-muted">
            1 {from} = {(data.rates[to] / data.rates[from]).toLocaleString(undefined, { maximumFractionDigits: 4 })} {to}
          </p>
        </Card>
      )}
      {data && (
        <div className="mt-3 flex flex-wrap gap-2">
          {quick.filter((c) => c !== to).map((c) => (
            <button key={c} onClick={() => setFrom(c)} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink">{c} → {to}</button>
          ))}
        </div>
      )}
    </Page>
  )
}

function CurrencyRow({ codes, code, onCode, children }: { codes: string[]; code: string; onCode: (c: string) => void; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
      <select value={code} onChange={(e) => onCode(e.target.value)} className="rounded-xl border border-line bg-surface px-2 py-2 font-semibold text-ink">
        {codes.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <div className="min-w-0 flex-1 text-right">{children}</div>
    </div>
  )
}
