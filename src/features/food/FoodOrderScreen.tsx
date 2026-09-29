import clsx from 'clsx'
import { Check, ChevronDown, History, MapPin, Store } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Field, Notice, Page, PageHeader } from '../../components/ui'
import { useAuth } from '../../store/auth'
import { Counter, DisclaimerAccept, EnquirySubmitted, LocationPicker, Steps } from '../orders/orderUi'
import { recordOrderStatus, saveFoodOrder, type FoodOrderRow } from '../orders/ordersRepo'
import {
  ALL_WINDOWS_ID,
  CITIES,
  datesBetween,
  daySummaries,
  formatSar,
  goldAllDays,
  goldFullDayAvailable,
  hasValidSelections,
  inTripWindow,
  mealLabel,
  MEALS,
  MENUS,
  nearbyPickupPoints,
  orderTotal,
  PICKUP_NOTICE,
  pruneToWindow,
  subtotals,
  TIME_SLOTS,
  toggleGoldDay,
  toggleSilverMeal,
  weekdayOf,
  type City,
  type Meal,
  type MealPlanInput,
  type PickupPoint,
  type Selection,
  type Tier,
} from './foodData'

const STEPS = ['City', 'Menu', 'Meals', 'Hotel', 'Review', 'Contact']

type Draft = {
  step: number
  city: City | null
  selections: Selection[]
  startDate: string | null
  endDate: string | null
  firstMeal: Meal | null
  lastMeal: Meal | null
  hotelName: string
  hotelAddress: string
  isInAzizia: boolean | null
  hotel: { lat: number; lng: number } | null
  pickup: PickupPoint | null
  name: string
  phone: string
  email: string
  pax: number
  accepted: boolean
}

const today = () => new Date().toISOString().slice(0, 10)

export function FoodOrderScreen() {
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const [d, setD] = useState<Draft>(() => ({
    step: 0,
    city: null,
    selections: [],
    startDate: null,
    endDate: null,
    firstMeal: null,
    lastMeal: null,
    hotelName: '',
    hotelAddress: '',
    isInAzizia: null,
    hotel: null,
    pickup: null,
    name: user?.name ?? '',
    phone: '',
    email: user?.email ?? '',
    pax: 1,
    accepted: false,
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<FoodOrderRow | null>(null)
  const [dialog, setDialog] = useState(false)
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }))

  const plan: MealPlanInput = { selections: d.selections, startDate: d.startDate, endDate: d.endDate, firstMeal: d.firstMeal, lastMeal: d.lastMeal, cityId: d.city?.id ?? null, isInAzizia: d.isInAzizia }
  const total = orderTotal(plan, d.pax)
  const points = useMemo(() => (d.hotel && d.city ? nearbyPickupPoints(d.hotel.lat, d.hotel.lng, d.city.name) : []), [d.hotel, d.city])

  const canNext = [
    !!d.city,
    true,
    d.selections.length > 0 && hasValidSelections(plan) && !!d.startDate && !!d.endDate && !!d.firstMeal,
    !!d.hotelName.trim() && !!d.hotelAddress.trim() && (d.city?.id !== 'makkah' || d.isInAzizia != null) && !!d.hotel && !!d.pickup,
    hasValidSelections(plan) && !!d.pickup,
    !!d.name.trim() && !!d.phone.trim() && !!d.email.trim() && d.pax > 0 && d.accepted,
  ][d.step]

  function setWindow(p: Partial<Pick<Draft, 'startDate' | 'endDate' | 'firstMeal' | 'lastMeal'>>) {
    setD((x) => {
      const next = { ...x, ...p }
      // Dates outside the trip, or meals before arrival / after departure, drop out.
      const inRange = next.startDate && next.endDate ? next.selections.filter((s) => s.date >= next.startDate! && s.date <= next.endDate!) : next.selections
      return { ...next, selections: pruneToWindow({ ...plan, ...next, selections: inRange }) }
    })
  }

  async function submit() {
    if (!d.city || !d.startDate || !d.endDate || !d.hotel || !d.pickup) return
    if (!hasValidSelections(plan)) return setError('Meal selections are incomplete or invalid. Please review.')
    setBusy(true)
    setError(null)
    const order: FoodOrderRow = {
      id: crypto.randomUUID(),
      city: d.city.name,
      menuTier: (d.selections[0]?.tier ?? 'silver') as Tier,
      selections: d.selections,
      startDate: d.startDate,
      endDate: d.endDate,
      hotelName: d.hotelName.trim(),
      hotelAddress: d.hotelAddress.trim(),
      hotelLat: d.hotel.lat,
      hotelLng: d.hotel.lng,
      pickupPointId: d.pickup.id,
      pickupPointName: d.pickup.name,
      pickupTime: ALL_WINDOWS_ID,
      customerName: d.name.trim(),
      customerPhone: d.phone.trim(),
      customerEmail: d.email.trim(),
      pax: d.pax,
      totalAmount: total,
      firstMeal: d.firstMeal,
      lastMeal: d.lastMeal,
      isInAzizia: d.isInAzizia,
      orderDate: new Date().toISOString(),
      status: 'pending',
    }
    try {
      await saveFoodOrder(order)
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
        <PageHeader title="Food enquiry" />
        <Card className="text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-on-primary">
            <Check className="size-8" />
          </div>
          <p className="mt-3 text-xl font-bold text-ink">Enquiry sent</p>
          <p className="mt-1 text-sm text-muted">Reference {done.id.slice(0, 8).toUpperCase()}</p>
          <p className="mt-3 text-sm text-ink">
            {MENUS[done.menuTier].name} plan for {done.pax} {done.pax === 1 ? 'person' : 'people'} in {done.city}, estimated {formatSar(done.totalAmount)}. Our team will confirm on WhatsApp at {done.customerPhone}.
          </p>
        </Card>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => navigate('/orders')}>My orders</Button>
          <Button onClick={() => navigate('/')}>Done</Button>
        </div>
        <EnquirySubmitted open={dialog} kind="food meal" onClose={() => setDialog(false)} />
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader
        title="Order meals"
        subtitle="Indian cuisine · pickup only"
        action={
          <button aria-label="Order history" onClick={() => navigate('/orders')} className="grid size-10 place-items-center rounded-full border border-line bg-surface">
            <History className="size-5" />
          </button>
        }
      />
      <Steps steps={STEPS} current={d.step} />

      <div className="space-y-3">
        {d.step === 0 && (
          <div className="grid grid-cols-2 gap-2">
            {CITIES.map((c) => (
              <Card key={c.id} onClick={() => set({ city: c, isInAzizia: c.id === 'makkah' ? d.isInAzizia : null, step: 1 })} className={clsx(d.city?.id === c.id && 'border-primary')}>
                <MapPin className="size-6 text-primary" />
                <p className="mt-2 font-bold text-ink">{c.name}</p>
                <p className="text-xs text-muted">Saudi Arabia</p>
              </Card>
            ))}
          </div>
        )}

        {d.step === 1 && (
          <>
            {(['silver', 'gold'] as Tier[]).map((t) => (
              <MenuCard key={t} tier={t} />
            ))}
            <Notice tone="info">You choose Silver meals or Gold days for each date on the next step. A day can't mix the two.</Notice>
          </>
        )}

        {d.step === 2 && (
          <>
            <Card>
              <p className="font-bold text-ink">Your trip</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Field label="Arrival" type="date" min={today()} value={d.startDate ?? ''} onChange={(e) => setWindow({ startDate: e.target.value || null, endDate: d.endDate && e.target.value > d.endDate ? e.target.value : d.endDate })} />
                <Field label="Departure" type="date" min={d.startDate ?? today()} value={d.endDate ?? ''} onChange={(e) => setWindow({ endDate: e.target.value || null })} />
              </div>
              {d.startDate && d.endDate && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <MealSelect label="First meal (arrival day)" value={d.firstMeal} onChange={(m) => setWindow({ firstMeal: m })} />
                  <MealSelect label="Last meal (departure day)" value={d.lastMeal} onChange={(m) => setWindow({ lastMeal: m })} />
                </div>
              )}
            </Card>

            {d.startDate && d.endDate && d.firstMeal && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted">Tap meals for Silver (SAR 26 each), or Gold for a full day (SAR 60).</p>
                  <Button variant="secondary" className="shrink-0" onClick={() => set({ selections: goldAllDays(plan) })}>Gold every day</Button>
                </div>
                {datesBetween(d.startDate, d.endDate).map((date) => (
                  <DayRow key={date} date={date} plan={plan} onChange={(selections) => set({ selections })} />
                ))}
              </>
            )}
            <TotalBar plan={plan} pax={d.pax} />
          </>
        )}

        {d.step === 3 && (
          <>
            <Card className="space-y-3">
              <Field label="Hotel name" placeholder="Enter hotel name" value={d.hotelName} onChange={(e) => set({ hotelName: e.target.value })} />
              <Field label="Hotel address" placeholder="Enter hotel address" value={d.hotelAddress} onChange={(e) => set({ hotelAddress: e.target.value })} />
              {d.city?.id === 'makkah' && (
                <div>
                  <p className="text-sm font-medium text-ink">Makkah area</p>
                  <p className="text-xs text-muted">Select whether your hotel is in Azizia.</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[
                      { v: true, l: 'Azizia' },
                      { v: false, l: 'Non-Azizia (Makkah)' },
                    ].map((o) => (
                      <button key={o.l} onClick={() => set({ isInAzizia: o.v })} className={clsx('rounded-xl border px-3 py-2.5 text-sm font-medium', d.isInAzizia === o.v ? 'border-primary bg-primary/10 text-ink' : 'border-line text-muted')}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
            <Card>
              <p className="mb-2 font-bold text-ink">Hotel location</p>
              <LocationPicker value={d.hotel} fallback={d.city ?? CITIES[0]} onChange={(lat, lng) => set({ hotel: { lat, lng }, pickup: null })} />
            </Card>
            {points.length > 0 && (
              <Card>
                <p className="font-bold text-ink">Nearby pickup points</p>
                <div className="mt-2 space-y-2">
                  {points.map((p) => (
                    <button key={p.id} onClick={() => set({ pickup: p })} className={clsx('flex w-full items-center gap-3 rounded-xl border p-3 text-left', d.pickup?.id === p.id ? 'border-primary bg-primary/10' : 'border-line')}>
                      <Store className="size-5 text-primary" />
                      <span className="flex-1">
                        <span className="block font-semibold text-ink">{p.name}</span>
                        <span className="block text-xs text-muted">{p.address} · {p.distanceKm.toFixed(1)} km away</span>
                      </span>
                      {d.pickup?.id === p.id && <Check className="size-5 text-primary" />}
                    </button>
                  ))}
                </div>
                {d.pickup && (
                  <>
                    <p className="mt-3 text-sm text-muted">Collect your meals at {d.pickup.name} during any of these fixed windows:</p>
                    <ul className="mt-1 space-y-0.5 text-sm text-ink">
                      {TIME_SLOTS.map((s) => (
                        <li key={s.id}>• {s.label}</li>
                      ))}
                    </ul>
                  </>
                )}
              </Card>
            )}
            <Notice tone="warn">{PICKUP_NOTICE}</Notice>
          </>
        )}

        {d.step === 4 && <Review d={d} plan={plan} />}

        {d.step === 5 && (
          <>
            <Card className="space-y-3">
              <Field label="Full name" value={d.name} onChange={(e) => set({ name: e.target.value })} autoComplete="name" />
              <Field label="WhatsApp number" type="tel" placeholder="+966501234567" value={d.phone} onChange={(e) => set({ phone: e.target.value })} autoComplete="tel" hint="Our team contacts you on WhatsApp." />
              <Field label="Email" type="email" value={d.email} onChange={(e) => set({ email: e.target.value })} autoComplete="email" />
              <Counter label="People" hint="Meals are priced per person" value={d.pax} min={1} max={50} onChange={(pax) => set({ pax })} />
            </Card>
            <DisclaimerAccept accepted={d.accepted} onChange={(accepted) => set({ accepted })} />
            <TotalBar plan={plan} pax={d.pax} />
          </>
        )}

        {error && <Notice tone="error">{error}</Notice>}

        <div className="flex gap-2 pt-1">
          {d.step > 0 && (
            <Button variant="secondary" onClick={() => set({ step: d.step - 1 })}>
              Back
            </Button>
          )}
          {d.step < STEPS.length - 1 ? (
            <Button className="flex-1" disabled={!canNext} onClick={() => set({ step: d.step + 1 })}>
              Next
            </Button>
          ) : (
            <Button className="flex-1" disabled={!canNext} loading={busy} onClick={submit}>
              Submit enquiry · {formatSar(total)}
            </Button>
          )}
        </div>
      </div>
    </Page>
  )
}

function MenuCard({ tier }: { tier: Tier }) {
  const m = MENUS[tier]
  const [open, setOpen] = useState(false)
  const wd = weekdayOf(new Date().toISOString().slice(0, 10))
  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl text-lg font-bold text-[#064e3b]" style={{ background: m.color }}>{m.name[0]}</span>
        <div className="flex-1">
          <p className="font-bold text-ink">{m.name}</p>
          <p className="text-sm text-muted">{m.description}</p>
        </div>
      </div>
      <ul className="mt-2 space-y-0.5 text-sm text-ink">
        {m.features.map((f) => (
          <li key={f}>✓ {f}</li>
        ))}
      </ul>
      <button onClick={() => setOpen(!open)} className="mt-2 flex items-center gap-1 text-sm font-semibold text-primary">
        Weekly menu <ChevronDown className={clsx('size-4 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {Object.entries(m.days).map(([day, menu]) => (
            <div key={day} className={clsx('rounded-xl p-2 text-sm', day === wd ? 'bg-primary/10' : 'bg-surface-2')}>
              <p className="font-semibold text-ink capitalize">{day}</p>
              {MEALS.map((meal) => (
                <p key={meal} className="text-muted">
                  <span className="font-medium text-ink">{mealLabel(meal)}:</span> {menu[meal].join(', ')}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function MealSelect({ label, value, onChange }: { label: string; value: Meal | null; onChange: (m: Meal) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value as Meal)} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-ink">
        <option value="" disabled>Select</option>
        {MEALS.map((m) => (
          <option key={m} value={m}>{mealLabel(m)}</option>
        ))}
      </select>
    </label>
  )
}

function DayRow({ date, plan, onChange }: { date: string; plan: MealPlanInput; onChange: (s: Selection[]) => void }) {
  const day = plan.selections.filter((s) => s.date === date)
  const isGold = day.length === 3 && day.every((s) => s.tier === 'gold')
  const goldOk = goldFullDayAvailable(date, plan)
  const wd = weekdayOf(date)
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink">
          {new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
        </p>
        <button
          disabled={!goldOk && !isGold}
          onClick={() => onChange(toggleGoldDay(plan, date))}
          title={goldOk ? 'Full day: breakfast, lunch and dinner' : 'Gold needs all three meals inside your trip'}
          className={clsx('rounded-full border px-3 py-1 text-xs font-bold disabled:opacity-40', isGold ? 'border-[#d4af37] bg-[#d4af37] text-[#064e3b]' : 'border-[#d4af37] text-gold')}
        >
          {isGold ? '★ Gold day' : 'Gold full day'}
        </button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {MEALS.map((meal) => {
          const allowed = inTripWindow({ date, meal }, plan)
          const on = day.some((s) => s.meal === meal && s.tier === 'silver')
          return (
            <button
              key={meal}
              disabled={!allowed}
              onClick={() => onChange(toggleSilverMeal(plan, date, meal))}
              className={clsx('rounded-xl border px-2 py-2 text-left text-xs disabled:opacity-35', on ? 'border-primary bg-primary/10' : 'border-line', isGold && 'opacity-50')}
            >
              <span className="block font-semibold text-ink">{mealLabel(meal)}</span>
              <span className="line-clamp-1 text-muted">{MENUS[isGold ? 'gold' : 'silver'].days[wd][meal].slice(0, 2).join(', ')}</span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function TotalBar({ plan, pax }: { plan: MealPlanInput; pax: number }) {
  const { meal, azizia } = subtotals(plan)
  return (
    <div className="flex items-center justify-between rounded-2xl bg-primary-strong px-4 py-3 text-white dark:text-[#064e3b]">
      <div className="text-sm">
        <p className="opacity-80">Estimated total{pax > 1 ? ` · ${pax} people` : ''}</p>
        {azizia > 0 && <p className="text-xs opacity-80">Includes Azizia area {formatSar(azizia)}</p>}
      </div>
      <p className="text-xl font-bold">{formatSar((meal + azizia) * pax)}</p>
    </div>
  )
}

function Review({ d, plan }: { d: Draft; plan: MealPlanInput }) {
  const lines = daySummaries(plan)
  const { meal, azizia } = subtotals(plan)
  return (
    <>
      <Card>
        <p className="font-bold text-ink">Meals</p>
        <div className="mt-2 divide-y divide-line text-sm">
          {lines.map((l) => (
            <div key={l.date} className="flex items-center justify-between py-1.5">
              <span className="text-ink">
                {new Date(l.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · <span className={l.tier === 'gold' ? 'text-gold' : 'text-muted'}>{l.tier === 'gold' ? 'Gold' : 'Silver'}</span>
                <span className="block text-xs text-muted">{l.isFullDay ? 'Full day (Breakfast, Lunch, Dinner)' : l.meals.map(mealLabel).join(', ')}</span>
              </span>
              <span className="font-semibold text-ink">{formatSar(l.subtotal)}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 space-y-1 border-t border-line pt-2 text-sm">
          <Row l="Meals" v={formatSar(meal)} />
          {azizia > 0 && <Row l="Azizia area" v={formatSar(azizia)} />}
        </div>
      </Card>
      <Card>
        <p className="font-bold text-ink">Pickup</p>
        <div className="mt-1 space-y-1 text-sm">
          <Row l="City" v={d.city?.name ?? ''} />
          <Row l="Hotel" v={d.hotelName} />
          <Row l="Pickup point" v={d.pickup?.name ?? ''} />
          <Row l="Windows" v="Any fixed pickup window" />
        </div>
      </Card>
      <Notice tone="info">Next, add your contact details and the number of people.</Notice>
    </>
  )
}

const Row = ({ l, v }: { l: string; v: string }) => (
  <div className="flex justify-between gap-3">
    <span className="text-muted">{l}</span>
    <span className="text-right font-medium text-ink">{v}</span>
  </div>
)

