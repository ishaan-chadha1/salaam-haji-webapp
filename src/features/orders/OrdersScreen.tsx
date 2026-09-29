import { Bus, MessageCircle, Receipt, UtensilsCrossed } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Empty, Notice, Page, PageHeader, Segmented, Sheet, Spinner } from '../../components/ui'
import { formatSar, mealLabel, MENUS } from '../food/foodData'
import { VEHICLES } from '../transport/transportData'
import { StatusPill } from './orderUi'
import { detectStatusChanges, loadOrders, statusLabel, type UnifiedOrder } from './ordersRepo'

type Filter = 'all' | 'food' | 'transport'

export function useOrders() {
  const [orders, setOrders] = useState<UnifiedOrder[] | null>(null)
  const [changes, setChanges] = useState<{ order: UnifiedOrder; previous: string }[]>([])
  useEffect(() => {
    let alive = true
    loadOrders()
      .then((o) => {
        if (!alive) return
        setOrders(o)
        setChanges(detectStatusChanges(o))
      })
      .catch(() => alive && setOrders([]))
    return () => {
      alive = false
    }
  }, [])
  return { orders, changes, clearChanges: () => setChanges([]) }
}

export function StatusChangesSheet({ changes, onClose }: { changes: { order: UnifiedOrder; previous: string }[]; onClose: () => void }) {
  return (
    <Sheet open={changes.length > 0} onClose={onClose} title={changes.length === 1 ? 'Order updated' : 'Orders updated'}>
      <p className="text-ink">Your enquiry status was updated. Please check WhatsApp — our team will reach out there with details.</p>
      <ul className="mt-2 space-y-1 text-sm text-ink">
        {changes.map((c) => (
          <li key={c.order.id}>
            • {c.order.type === 'food' ? 'Food' : 'Transport'} · {c.order.title}: {statusLabel(c.previous)} → {statusLabel(c.order.status)}
          </li>
        ))}
      </ul>
      <Button className="mt-4 w-full" onClick={onClose}>
        <MessageCircle className="size-4" /> Got it
      </Button>
    </Sheet>
  )
}

export function OrdersScreen() {
  const navigate = useNavigate()
  const { orders, changes, clearChanges } = useOrders()
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<UnifiedOrder | null>(null)
  const shown = (orders ?? []).filter((o) => filter === 'all' || o.type === filter)

  return (
    <Page>
      <PageHeader title="My orders" subtitle="Food and transport enquiries" />
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All' },
          { value: 'food', label: 'Food' },
          { value: 'transport', label: 'Transport' },
        ]}
      />
      <div className="mt-3 space-y-2">
        {orders == null ? (
          <Spinner label="Loading orders…" />
        ) : shown.length === 0 ? (
          <Empty icon={<Receipt className="size-10" />} title="No orders yet">
            <div className="mt-3 flex justify-center gap-2">
              <Button variant="secondary" onClick={() => navigate('/food')}>Order meals</Button>
              <Button variant="secondary" onClick={() => navigate('/transport')}>Book transport</Button>
            </div>
          </Empty>
        ) : (
          shown.map((o) => (
            <Card key={o.id} onClick={() => setOpen(o)}>
              <div className="flex items-center gap-3">
                <span className={`grid size-11 place-items-center rounded-xl text-white ${o.type === 'food' ? 'bg-orange-500' : 'bg-teal-600'}`}>
                  {o.type === 'food' ? <UtensilsCrossed className="size-5" /> : <Bus className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-ink">{o.title}</p>
                    <StatusPill status={o.status} />
                  </div>
                  <p className="truncate text-xs text-muted">{o.subtitle} · {o.city}</p>
                  <p className="text-xs text-muted">{o.dateLabel}</p>
                </div>
                <p className="font-bold text-ink">{o.total > 0 ? formatSar(o.total) : 'Quote'}</p>
              </div>
            </Card>
          ))
        )}
      </div>

      <Sheet open={open != null} onClose={() => setOpen(null)} title={open?.title ?? ''}>
        {open && <OrderDetail o={open} />}
      </Sheet>
      <StatusChangesSheet changes={changes} onClose={clearChanges} />
    </Page>
  )
}

function OrderDetail({ o }: { o: UnifiedOrder }) {
  const rows: [string, string][] = [['Status', statusLabel(o.status)], ['Reference', o.id.slice(0, 8).toUpperCase()]]
  if (o.food) {
    const f = o.food
    rows.push(['Plan', `${MENUS[f.menuTier]?.name ?? f.menuTier} · ${f.pax} ${f.pax === 1 ? 'person' : 'people'}`], ['Dates', o.dateLabel], ['Meals', `${f.selections.length}`])
    if (f.firstMeal) rows.push(['First meal', mealLabel(f.firstMeal)])
    if (f.lastMeal) rows.push(['Last meal', mealLabel(f.lastMeal)])
    rows.push(['Hotel', `${f.hotelName}, ${f.hotelAddress}`], ['Pickup', 'Any fixed pickup window'])
  }
  if (o.transport) {
    const t = o.transport
    rows.push(
      ['Date', `${o.dateLabel} · ${t.pickupTime}`],
      ['From', t.pickupAddress],
      ['To', t.dropoffAddress],
      ['Vehicle', `${VEHICLES.find((v) => v.id === t.vehicleTypeId)?.name ?? t.vehicleTypeId} · ${t.passengers} pax · ${t.bags} bags`],
    )
    if (t.airline) rows.push(['Flight', `${t.airline.airlineName} ${t.airline.flightNumber}`])
  }
  rows.push(['Estimated total', o.total > 0 ? formatSar(o.total) : 'Quote on enquiry'])
  return (
    <div className="space-y-3">
      <div className="space-y-1.5 text-sm">
        {rows.map(([l, v]) => (
          <div key={l} className="flex justify-between gap-4">
            <span className="text-muted">{l}</span>
            <span className="text-right font-medium text-ink">{v}</span>
          </div>
        ))}
      </div>
      <Notice tone="info">Our team handles confirmation and changes on WhatsApp.</Notice>
    </div>
  )
}
