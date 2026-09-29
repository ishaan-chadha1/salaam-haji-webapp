import clsx from 'clsx'
import { ArrowRight, Check, History, Plane } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Field, Notice, Page, PageHeader, Segmented } from '../../components/ui'
import { useAuth } from '../../store/auth'
import { formatSar } from '../food/foodData'
import { Counter, DisclaimerAccept, EnquirySubmitted, Steps } from '../orders/orderUi'
import { recordOrderStatus, saveTransportOrder, type TransportOrderRow } from '../orders/ordersRepo'
import { POPULAR_ROUTE_IDS, priceFor, ROUTES, tourRoute, VEHICLES, type Endpoint, type EnquiryType, type Route, type TourDuration, type Vehicle } from './transportData'

const STEPS = ['Route', 'Location', 'Vehicle', 'Passengers', 'Schedule', 'Contact']

type Draft = {
  step: number
  type: EnquiryType
  route: Route | null
  pickup: Endpoint | null
  dropoff: Endpoint | null
  tourCity: 'Makkah' | 'Madinah'
  tourDuration: TourDuration
  customFrom: string
  customTo: string
  customNotes: string
  pickupHotelName: string
  pickupHotelAddress: string
  dropoffHotelName: string
  dropoffHotelAddress: string
  vehicle: Vehicle | null
  passengers: number
  bags: number
  date: string
  time: string
  airline: string
  flight: string
  terminal: string
  name: string
  phone: string
  email: string
  accepted: boolean
}

const isAirport = (d: Draft) => d.type === 'transfer' && (d.pickup?.type === 'airport' || d.dropoff?.type === 'airport')

export function TransportOrderScreen() {
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const [d, setD] = useState<Draft>({
    step: 0,
    type: 'transfer',
    route: null,
    pickup: null,
    dropoff: null,
    tourCity: 'Makkah',
    tourDuration: 'halfDay',
    customFrom: '',
    customTo: '',
    customNotes: '',
    pickupHotelName: '',
    pickupHotelAddress: '',
    dropoffHotelName: '',
    dropoffHotelAddress: '',
    vehicle: null,
    passengers: 1,
    bags: 0,
    date: '',
    time: '',
    airline: '',
    flight: '',
    terminal: '',
    name: user?.name ?? '',
    phone: '',
    email: user?.email ?? '',
    accepted: false,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<TransportOrderRow | null>(null)
  const [dialog, setDialog] = useState(false)
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }))

  const route = d.type === 'dayTour' ? tourRoute(d.tourCity, d.tourDuration) : d.route
  const pickup = d.type === 'dayTour' ? route!.pickup[0] : d.pickup
  const dropoff = d.type === 'dayTour' ? route!.dropoff[0] : d.dropoff
  const price = d.vehicle ? priceFor({ enquiryType: d.type, tourDuration: d.tourDuration, routeId: route?.id ?? null }, d.vehicle) : 0
  const flightNeeded = isAirport(d)

  const canNext = [
    d.type === 'custom' ? !!d.customFrom.trim() && !!d.customTo.trim() : !!route,
    d.type === 'custom' ||
      ((pickup?.type !== 'hotel' || (!!d.pickupHotelName.trim() && !!d.pickupHotelAddress.trim())) &&
        (dropoff?.type !== 'hotel' || d.type === 'dayTour' || (!!d.dropoffHotelName.trim() && !!d.dropoffHotelAddress.trim()))),
    !!d.vehicle,
    !!d.vehicle && d.passengers > 0 && d.passengers <= d.vehicle.maxPassengers && d.bags <= d.vehicle.maxBags,
    !!d.date && !!d.time && (!flightNeeded || (!!d.airline.trim() && !!d.flight.trim())),
    !!d.name.trim() && !!d.phone.trim() && !!d.email.trim() && d.accepted,
  ][d.step]

  function pickRoute(r: Route) {
    set({ route: r, pickup: r.pickup[0], dropoff: r.dropoff[0], pickupHotelName: '', pickupHotelAddress: '', dropoffHotelName: '', dropoffHotelAddress: '' })
  }

  async function submit() {
    setBusy(true)
    setError(null)
    const custom = d.type === 'custom'
    const pickupLabel = custom ? d.customFrom.trim() : (pickup?.label ?? route?.fromCity ?? '')
    const dropoffLabel = custom ? d.customTo.trim() : (dropoff?.label ?? route?.toCity ?? '')
    const [h, m] = d.time.split(':')
    const order: TransportOrderRow = {
      id: crypto.randomUUID(),
      city: route?.fromCity ?? 'Custom',
      sectorId: route?.id ?? 'custom_enquiry',
      sectorName: custom ? `Custom: ${pickupLabel} → ${dropoffLabel}` : (route?.name ?? 'Transport enquiry'),
      pickupAddress: d.pickupHotelAddress.trim() ? `${d.pickupHotelName.trim()} - ${d.pickupHotelAddress.trim()}` : pickupLabel,
      dropoffAddress: d.dropoffHotelAddress.trim() ? `${d.dropoffHotelName.trim()} - ${d.dropoffHotelAddress.trim()}` : dropoffLabel,
      vehicleTypeId: (d.vehicle ?? VEHICLES[0]).id,
      passengers: d.passengers,
      bags: d.bags,
      pickupDate: d.date,
      pickupTime: d.time,
      isFromAirport: flightNeeded,
      airline: flightNeeded
        ? { airlineName: d.airline.trim(), flightNumber: d.flight.trim(), terminal: d.terminal.trim() || null, arrivalTime: new Date(`${d.date}T${h.padStart(2, '0')}:${(m ?? '0').padStart(2, '0')}:00`).toISOString() }
        : null,
      customerName: d.name.trim(),
      customerPhone: d.phone.trim(),
      customerEmail: d.email.trim(),
      totalAmount: price,
      tripType: d.type === 'dayTour' ? (d.tourDuration === 'halfDay' ? 'half_day_tour' : 'day_tour') : 'transfer',
      notes: custom ? d.customNotes.trim() : undefined,
      orderDate: new Date().toISOString(),
      status: 'pending',
    }
    try {
      await saveTransportOrder(order)
      recordOrderStatus(order.id, 'pending')
      setDone(order)
      setDialog(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit order.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <Page>
        <PageHeader title="Transport enquiry" />
        <Card className="text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-on-primary">
            <Check className="size-8" />
          </div>
          <p className="mt-3 text-xl font-bold text-ink">Enquiry sent</p>
          <p className="mt-1 text-sm text-muted">Reference {done.id.slice(0, 8).toUpperCase()}</p>
          <p className="mt-3 text-sm text-ink">
            {done.sectorName} on {new Date(done.pickupDate + 'T12:00:00').toLocaleDateString()} at {done.pickupTime}
            {done.totalAmount > 0 ? `, estimated ${formatSar(done.totalAmount)}` : ' — we will quote on WhatsApp'}. Our team will confirm on WhatsApp at {done.customerPhone}.
          </p>
        </Card>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => navigate('/orders')}>My orders</Button>
          <Button onClick={() => navigate('/')}>Done</Button>
        </div>
        <EnquirySubmitted open={dialog} kind="transport" onClose={() => setDialog(false)} />
      </Page>
    )
  }

  const starts = [...new Map(ROUTES.flatMap((r) => r.pickup).map((e) => [e.id, e])).values()]
  const ends = d.pickup ? [...new Map(ROUTES.filter((r) => r.pickup.some((p) => p.id === d.pickup!.id)).flatMap((r) => r.dropoff).map((e) => [e.id, e])).values()] : []

  return (
    <Page>
      <PageHeader
        title="Book transport"
        subtitle="Transfers, tours and custom trips"
        action={
          <button aria-label="Order history" onClick={() => navigate('/orders')} className="grid size-10 place-items-center rounded-full border border-line bg-surface">
            <History className="size-5" />
          </button>
        }
      />
      <Steps steps={STEPS} current={d.step} />

      <div className="space-y-3">
        {d.step === 0 && (
          <>
            <Segmented
              value={d.type}
              onChange={(type) => set({ type })}
              options={[
                { value: 'transfer', label: 'Transfer' },
                { value: 'dayTour', label: 'Day tour' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
            {d.type === 'transfer' && (
              <>
                <p className="text-sm font-semibold text-muted uppercase">Popular routes</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {POPULAR_ROUTE_IDS.map((id) => ROUTES.find((r) => r.id === id)!).map((r) => (
                    <RouteButton key={r.id} r={r} selected={d.route?.id === r.id} onClick={() => pickRoute(r)} />
                  ))}
                </div>
                <Card>
                  <p className="font-semibold text-ink">Or build your route</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-sm text-muted">
                      From
                      <select
                        value={d.pickup?.id ?? ''}
                        onChange={(e) => set({ pickup: starts.find((s) => s.id === e.target.value) ?? null, dropoff: null, route: null })}
                        className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-ink"
                      >
                        <option value="">Select</option>
                        {starts.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm text-muted">
                      To
                      <select
                        value={d.dropoff?.id ?? ''}
                        disabled={!d.pickup}
                        onChange={(e) => {
                          const drop = ends.find((s) => s.id === e.target.value) ?? null
                          const r = drop && d.pickup ? ROUTES.find((x) => x.pickup.some((p) => p.id === d.pickup!.id) && x.dropoff.some((q) => q.id === drop.id)) ?? null : null
                          set({ dropoff: drop, route: r })
                        }}
                        className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-ink disabled:opacity-50"
                      >
                        <option value="">Select</option>
                        {ends.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {d.route && !POPULAR_ROUTE_IDS.includes(d.route.id) && <p className="mt-2 text-sm text-primary">Route {d.route.code}: {d.route.name}</p>}
                </Card>
              </>
            )}
            {d.type === 'dayTour' && (
              <Card className="space-y-3">
                <p className="font-semibold text-ink">Ziyarat day tour from your hotel</p>
                <Segmented value={d.tourCity} onChange={(tourCity) => set({ tourCity })} options={[{ value: 'Makkah', label: 'Makkah' }, { value: 'Madinah', label: 'Madinah' }]} />
                <Segmented value={d.tourDuration} onChange={(tourDuration) => set({ tourDuration })} options={[{ value: 'halfDay', label: 'Half day · 4 h' }, { value: 'fullDay', label: 'Full day · 8 h' }]} />
                <p className="text-sm text-muted">{tourRoute(d.tourCity, d.tourDuration).name}</p>
              </Card>
            )}
            {d.type === 'custom' && (
              <Card className="space-y-3">
                <p className="text-sm text-muted">For routes not listed above. Our team will quote on WhatsApp.</p>
                <Field label="From" placeholder="e.g. Makkah hotel" value={d.customFrom} onChange={(e) => set({ customFrom: e.target.value })} />
                <Field label="To" placeholder="e.g. Jabal al-Nour" value={d.customTo} onChange={(e) => set({ customTo: e.target.value })} />
                <Field label="Notes (optional)" placeholder="Stops, timing, special needs" value={d.customNotes} onChange={(e) => set({ customNotes: e.target.value })} />
              </Card>
            )}
          </>
        )}

        {d.step === 1 && (
          <>
            {d.type === 'custom' ? (
              <Notice tone="info">Exact addresses for custom trips are arranged with our team on WhatsApp.</Notice>
            ) : (
              <>
                <Card>
                  <p className="text-sm text-muted">Route</p>
                  <p className="font-bold text-ink">{route?.name}</p>
                  {route && route.pickup.length > 1 && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {route.pickup.map((p) => (
                        <button key={p.id} onClick={() => set({ pickup: p, dropoff: route.dropoff.find((x) => x.id !== p.id) ?? route.dropoff[0] })} className={clsx('rounded-xl border px-3 py-2 text-sm', d.pickup?.id === p.id ? 'border-primary bg-primary/10 text-ink' : 'border-line text-muted')}>
                          From {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
                {pickup?.type === 'hotel' && (
                  <Card className="space-y-3">
                    <p className="font-semibold text-ink">Pickup hotel</p>
                    <Field label="Hotel name" value={d.pickupHotelName} onChange={(e) => set({ pickupHotelName: e.target.value })} />
                    <Field label="Hotel address" value={d.pickupHotelAddress} onChange={(e) => set({ pickupHotelAddress: e.target.value })} />
                  </Card>
                )}
                {dropoff?.type === 'hotel' && d.type !== 'dayTour' && (
                  <Card className="space-y-3">
                    <p className="font-semibold text-ink">Drop-off hotel</p>
                    <Field label="Hotel name" value={d.dropoffHotelName} onChange={(e) => set({ dropoffHotelName: e.target.value })} />
                    <Field label="Hotel address" value={d.dropoffHotelAddress} onChange={(e) => set({ dropoffHotelAddress: e.target.value })} />
                  </Card>
                )}
                {pickup?.type !== 'hotel' && dropoff?.type !== 'hotel' && <Notice tone="info">No hotel details needed for this route.</Notice>}
              </>
            )}
          </>
        )}

        {d.step === 2 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {VEHICLES.map((v) => {
              const p = priceFor({ enquiryType: d.type, tourDuration: d.tourDuration, routeId: route?.id ?? null }, v)
              return (
                <Card
                  key={v.id}
                  onClick={() => set({ vehicle: v, passengers: Math.min(d.passengers, v.maxPassengers), bags: Math.min(d.bags, v.maxBags), step: 3 })}
                  className={clsx(d.vehicle?.id === v.id && 'border-primary')}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{v.emoji}</span>
                    <div className="flex-1">
                      <p className="font-bold text-ink">{v.name}</p>
                      <p className="text-xs text-muted">{v.maxPassengers} passengers · {v.maxBags} bags</p>
                      <p className="text-xs text-muted">{v.description}</p>
                    </div>
                    <p className="font-bold text-primary">{d.type === 'custom' ? 'Quote' : formatSar(p)}</p>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {d.step === 3 && d.vehicle && (
          <Card className="space-y-4">
            <p className="font-semibold text-ink">{d.vehicle.emoji} {d.vehicle.name}</p>
            <Counter label="Passengers" hint={`Up to ${d.vehicle.maxPassengers}`} value={d.passengers} min={1} max={d.vehicle.maxPassengers} onChange={(passengers) => set({ passengers })} />
            <Counter label="Bags" hint={`Up to ${d.vehicle.maxBags}`} value={d.bags} min={0} max={d.vehicle.maxBags} onChange={(bags) => set({ bags })} />
            <p className="text-xs text-muted">Need more room? Go back and pick a bigger vehicle.</p>
          </Card>
        )}

        {d.step === 4 && (
          <>
            <Card className="grid grid-cols-2 gap-3">
              <Field label="Pickup date" type="date" min={new Date().toISOString().slice(0, 10)} value={d.date} onChange={(e) => set({ date: e.target.value })} />
              <Field label="Pickup time" type="time" value={d.time} onChange={(e) => set({ time: e.target.value })} />
            </Card>
            {flightNeeded && (
              <Card className="space-y-3">
                <p className="flex items-center gap-2 font-semibold text-ink"><Plane className="size-5 text-primary" /> Flight reference</p>
                <p className="text-sm text-muted">So the driver can track your flight at the airport.</p>
                <Field label="Airline" placeholder="e.g. Saudia" value={d.airline} onChange={(e) => set({ airline: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Flight number" placeholder="SV 123" value={d.flight} onChange={(e) => set({ flight: e.target.value.toUpperCase() })} />
                  <Field label="Terminal (optional)" value={d.terminal} onChange={(e) => set({ terminal: e.target.value })} />
                </div>
              </Card>
            )}
          </>
        )}

        {d.step === 5 && (
          <>
            <Card className="space-y-1 text-sm">
              <SummaryRow l="Trip" v={d.type === 'custom' ? `${d.customFrom} → ${d.customTo}` : (route?.name ?? '')} />
              <SummaryRow l="Vehicle" v={`${d.vehicle?.name} · ${d.passengers} pax · ${d.bags} bags`} />
              <SummaryRow l="When" v={`${d.date ? new Date(d.date + 'T12:00:00').toLocaleDateString() : ''} ${d.time}`} />
              {flightNeeded && <SummaryRow l="Flight" v={`${d.airline} ${d.flight}`} />}
              <SummaryRow l="Price" v={d.type === 'custom' ? 'Quote on enquiry' : formatSar(price)} />
            </Card>
            <Card className="space-y-3">
              <Field label="Full name" value={d.name} onChange={(e) => set({ name: e.target.value })} autoComplete="name" />
              <Field label="WhatsApp number" type="tel" placeholder="+966501234567" value={d.phone} onChange={(e) => set({ phone: e.target.value })} autoComplete="tel" hint="Our team contacts you on WhatsApp." />
              <Field label="Email" type="email" value={d.email} onChange={(e) => set({ email: e.target.value })} autoComplete="email" />
            </Card>
            <DisclaimerAccept accepted={d.accepted} onChange={(accepted) => set({ accepted })} />
          </>
        )}

        {error && <Notice tone="error">{error}</Notice>}

        <div className="flex gap-2 pt-1">
          {d.step > 0 && <Button variant="secondary" onClick={() => set({ step: d.step - 1 })}>Back</Button>}
          {d.step < STEPS.length - 1 ? (
            <Button className="flex-1" disabled={!canNext} onClick={() => set({ step: d.step + 1 })}>Next</Button>
          ) : (
            <Button className="flex-1" disabled={!canNext} loading={busy} onClick={submit}>
              Submit enquiry{d.type !== 'custom' && d.vehicle ? ` · ${formatSar(price)}` : ''}
            </Button>
          )}
        </div>
      </div>
    </Page>
  )
}

function RouteButton({ r, selected, onClick }: { r: Route; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={clsx('flex items-center gap-2 rounded-2xl border bg-surface p-3 text-left', selected ? 'border-primary bg-primary/10' : 'border-line')}>
      <span className="rounded-lg bg-surface-2 px-2 py-1 text-xs font-bold text-muted">{r.code}</span>
      <span className="flex flex-1 flex-wrap items-center gap-1 text-sm font-medium text-ink">
        {r.pickup[0].label} <ArrowRight className="size-3.5 text-muted" /> {r.dropoff[0].label}
      </span>
      {selected && <Check className="size-5 text-primary" />}
    </button>
  )
}

const SummaryRow = ({ l, v }: { l: string; v: string }) => (
  <div className="flex justify-between gap-3">
    <span className="text-muted">{l}</span>
    <span className="text-right font-medium text-ink">{v}</span>
  </div>
)
