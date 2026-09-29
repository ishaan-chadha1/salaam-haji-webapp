import { Bus, ChevronRight, UtensilsCrossed } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatSar } from '../food/foodData'
import { StatusPill } from './orderUi'
import { StatusChangesSheet, useOrders } from './OrdersScreen'

/** Home carousel of bookings from today onwards (upcoming_bookings_carousel.dart). */
export function UpcomingBookings() {
  const navigate = useNavigate()
  const { orders, changes, clearChanges } = useOrders()
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = (orders ?? [])
    .filter((o) => (o.food ? o.food.endDate : o.displayDate) >= today && o.status !== 'cancelled')
    .sort((a, b) => a.displayDate.localeCompare(b.displayDate))
  return (
    <>
      {upcoming.length > 0 && (
        <section className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Upcoming bookings</h2>
            <button onClick={() => navigate('/orders')} className="flex items-center text-sm font-semibold text-primary">
              All <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
            {upcoming.map((o) => (
              <button key={o.id} onClick={() => navigate('/orders')} className="w-64 shrink-0 snap-start rounded-2xl border border-line bg-surface p-3 text-left">
                <div className="flex items-center gap-2">
                  <span className={`grid size-8 place-items-center rounded-lg text-white ${o.type === 'food' ? 'bg-orange-500' : 'bg-teal-600'}`}>
                    {o.type === 'food' ? <UtensilsCrossed className="size-4" /> : <Bus className="size-4" />}
                  </span>
                  <p className="min-w-0 flex-1 truncate font-semibold text-ink">{o.title}</p>
                  <StatusPill status={o.status} />
                </div>
                <p className="mt-2 text-sm text-ink">{o.dateLabel}{o.type === 'transport' ? ` · ${o.time}` : ''}</p>
                <p className="text-xs text-muted">{o.city} · {o.total > 0 ? formatSar(o.total) : 'Quote pending'}</p>
              </button>
            ))}
          </div>
        </section>
      )}
      <StatusChangesSheet changes={changes} onClose={clearChanges} />
    </>
  )
}
