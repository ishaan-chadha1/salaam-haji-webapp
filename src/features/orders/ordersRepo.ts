import { load, save } from '../../lib/storage'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/auth'
import { MENUS, weekdayOf, type Meal, type Selection, type Tier } from '../food/foodData'
import { routeName, VEHICLES } from '../transport/transportData'

// Saves and loads enquiries in the same food_orders / transport_orders tables
// as food_order_repository.dart and transport_order_repository.dart, with a
// local copy so preview mode and offline still work.

export type FoodOrderRow = {
  id: string
  city: string
  menuTier: Tier
  selections: Selection[]
  startDate: string
  endDate: string
  hotelName: string
  hotelAddress: string
  hotelLat: number
  hotelLng: number
  pickupPointId: string | null
  pickupPointName?: string
  pickupTime: string
  customerName: string
  customerPhone: string
  customerEmail: string
  pax: number
  totalAmount: number
  firstMeal: Meal | null
  lastMeal: Meal | null
  isInAzizia?: boolean | null
  orderDate: string
  status: string
}

export type TransportOrderRow = {
  id: string
  city: string
  sectorId: string
  sectorName: string
  pickupAddress: string
  dropoffAddress: string
  vehicleTypeId: string
  passengers: number
  bags: number
  pickupDate: string
  pickupTime: string
  isFromAirport: boolean
  airline: { airlineName: string; flightNumber: string; arrivalTime?: string | null; terminal?: string | null } | null
  customerName: string
  customerPhone: string
  customerEmail: string
  totalAmount: number
  tripType: 'transfer' | 'day_tour' | 'half_day_tour'
  notes?: string
  orderDate: string
  status: string
}

export type UnifiedOrder = {
  id: string
  type: 'food' | 'transport'
  title: string
  subtitle: string
  displayDate: string // yyyy-mm-dd, the service date
  dateLabel: string
  time: string
  city: string
  status: string
  total: number
  food?: FoodOrderRow
  transport?: TransportOrderRow
}

const FOOD_KEY = 'food_orders_v1'
const TRANSPORT_KEY = 'transport_orders_v1'

function userId(): string | null {
  const u = useAuth.getState().user
  return u && !u.isPreview ? u.id : null
}

const localFood = () => load<FoodOrderRow[]>(FOOD_KEY, [])
const localTransport = () => load<TransportOrderRow[]>(TRANSPORT_KEY, [])

function remember<T extends { id: string }>(key: string, list: T[], row: T) {
  save(key, [row, ...list.filter((o) => o.id !== row.id)])
}

export async function saveFoodOrder(o: FoodOrderRow): Promise<void> {
  remember(FOOD_KEY, localFood(), o)
  const uid = userId()
  if (!supabase || !uid) return
  const row: Record<string, unknown> = {
    id: o.id,
    user_id: uid,
    city: o.city,
    cuisine_type: 'indian',
    menu_tier: o.menuTier,
    meal_counts: {},
    selected_meals: o.selections.map((s) => ({ day_of_week: weekdayOf(s.date), meal_type: s.meal, menu_tier: s.tier, date: s.date })),
    start_date: new Date(o.startDate + 'T00:00:00').toISOString(),
    end_date: new Date(o.endDate + 'T00:00:00').toISOString(),
    hotel_name: o.hotelName,
    hotel_address: o.hotelAddress,
    hotel_latitude: o.hotelLat,
    hotel_longitude: o.hotelLng,
    pickup_point_id: o.pickupPointId,
    pickup_time: o.pickupTime,
    customer_name: o.customerName,
    customer_phone: o.customerPhone,
    customer_email: o.customerEmail,
    pax: o.pax,
    communication_method: 'whatsapp',
    total_amount: o.totalAmount,
    delivery_fee: 0,
    first_meal: o.firstMeal,
    last_meal: o.lastMeal,
    order_date: o.orderDate,
    payment_id: null,
    payment_method: 'enquiry',
    status: o.status,
  }
  let { error } = await supabase.from('food_orders').upsert(row, { onConflict: 'id' })
  if (error) {
    // Older schemas lack these columns (same fallback as the app).
    delete row.payment_method
    delete row.pax
    ;({ error } = await supabase.from('food_orders').upsert(row, { onConflict: 'id' }))
  }
  if (error) throw new Error('Saved on this device, but the server did not accept it. Please try again.')
}

export async function saveTransportOrder(o: TransportOrderRow): Promise<void> {
  remember(TRANSPORT_KEY, localTransport(), o)
  const uid = userId()
  if (!supabase || !uid) return
  const row: Record<string, unknown> = {
    id: o.id,
    user_id: uid,
    city: o.city,
    sector_id: o.sectorId,
    pickup_latitude: 0,
    pickup_longitude: 0,
    pickup_address: o.pickupAddress,
    dropoff_latitude: null,
    dropoff_longitude: null,
    dropoff_address: o.dropoffAddress,
    vehicle_type_id: o.vehicleTypeId,
    number_of_passengers: o.passengers,
    number_of_bags: o.bags,
    pickup_date: new Date(o.pickupDate + 'T00:00:00').toISOString(),
    pickup_time: o.pickupTime,
    is_from_airport: o.isFromAirport,
    airline_info: o.airline
      ? { airline_name: o.airline.airlineName, flight_number: o.airline.flightNumber, arrival_time: o.airline.arrivalTime ?? null, departure_time: null, terminal: o.airline.terminal ?? null, gate: null }
      : null,
    customer_name: o.customerName,
    customer_phone: o.customerPhone,
    customer_email: o.customerEmail,
    total_amount: o.totalAmount,
    distance_km: null,
    order_date: o.orderDate,
    payment_id: null,
    payment_method: 'enquiry',
    trip_type: o.tripType,
    status: o.status,
  }
  let { error } = await supabase.from('transport_orders').upsert(row, { onConflict: 'id' })
  if (error) {
    delete row.payment_method
    delete row.trip_type
    ;({ error } = await supabase.from('transport_orders').upsert(row, { onConflict: 'id' }))
  }
  if (error) throw new Error('Saved on this device, but the server did not accept it. Please try again.')
}

const day = (iso: string) => (iso ?? '').slice(0, 10)

function foodFromRow(r: Record<string, unknown>): FoodOrderRow {
  const start = day(r.start_date as string)
  const meals = (r.selected_meals as { day_of_week: string; meal_type: Meal; menu_tier: Tier; date?: string }[]) ?? []
  return {
    id: r.id as string,
    city: r.city as string,
    menuTier: (r.menu_tier as Tier) ?? 'silver',
    selections: meals.map((m) => ({ date: m.date ?? start, meal: m.meal_type, tier: m.menu_tier })),
    startDate: start,
    endDate: day(r.end_date as string),
    hotelName: r.hotel_name as string,
    hotelAddress: r.hotel_address as string,
    hotelLat: Number(r.hotel_latitude),
    hotelLng: Number(r.hotel_longitude),
    pickupPointId: (r.pickup_point_id as string) ?? null,
    pickupTime: r.pickup_time as string,
    customerName: r.customer_name as string,
    customerPhone: r.customer_phone as string,
    customerEmail: r.customer_email as string,
    pax: Number(r.pax ?? 1),
    totalAmount: Number(r.total_amount),
    firstMeal: (r.first_meal as Meal) ?? null,
    lastMeal: (r.last_meal as Meal) ?? null,
    orderDate: (r.order_date as string) ?? new Date().toISOString(),
    status: (r.status as string) ?? 'pending',
  }
}

function transportFromRow(r: Record<string, unknown>): TransportOrderRow {
  const a = r.airline_info as Record<string, string> | null
  return {
    id: r.id as string,
    city: r.city as string,
    sectorId: r.sector_id as string,
    sectorName: routeName(r.sector_id as string),
    pickupAddress: r.pickup_address as string,
    dropoffAddress: (r.dropoff_address as string) ?? '',
    vehicleTypeId: r.vehicle_type_id as string,
    passengers: Number(r.number_of_passengers),
    bags: Number(r.number_of_bags),
    pickupDate: day(r.pickup_date as string),
    pickupTime: r.pickup_time as string,
    isFromAirport: !!r.is_from_airport,
    airline: a ? { airlineName: a.airline_name, flightNumber: a.flight_number, arrivalTime: a.arrival_time, terminal: a.terminal } : null,
    customerName: r.customer_name as string,
    customerPhone: r.customer_phone as string,
    customerEmail: r.customer_email as string,
    totalAmount: Number(r.total_amount),
    tripType: ((r.trip_type as string) ?? 'transfer') as TransportOrderRow['tripType'],
    orderDate: (r.order_date as string) ?? new Date().toISOString(),
    status: (r.status as string) ?? 'pending',
  }
}

const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

export function unifyFood(o: FoodOrderRow): UnifiedOrder {
  return {
    id: o.id,
    type: 'food',
    title: 'Food order',
    subtitle: `${MENUS[o.menuTier]?.name ?? 'Meal'} plan · ${o.pax} ${o.pax === 1 ? 'person' : 'people'}`,
    displayDate: o.startDate,
    dateLabel: `${fmt(o.startDate)} – ${fmt(o.endDate)}`,
    time: 'Pickup windows',
    city: o.city,
    status: o.status,
    total: o.totalAmount,
    food: o,
  }
}

export function unifyTransport(o: TransportOrderRow): UnifiedOrder {
  return {
    id: o.id,
    type: 'transport',
    title: o.sectorName || 'Transport booking',
    subtitle: VEHICLES.find((v) => v.id === o.vehicleTypeId)?.name ?? 'Vehicle',
    displayDate: o.pickupDate,
    dateLabel: fmt(o.pickupDate),
    time: o.pickupTime,
    city: o.city,
    status: o.status,
    total: o.totalAmount,
    transport: o,
  }
}

/** Server orders when signed in (falling back to this device's copies). */
export async function loadOrders(): Promise<UnifiedOrder[]> {
  let food = localFood()
  let transport = localTransport()
  const uid = userId()
  if (supabase && uid) {
    const [f, t] = await Promise.all([
      supabase.from('food_orders').select().eq('user_id', uid).order('order_date', { ascending: false }),
      supabase.from('transport_orders').select().eq('user_id', uid).order('order_date', { ascending: false }),
    ])
    if (!f.error) food = (f.data ?? []).flatMap((r) => { try { return [foodFromRow(r)] } catch { return [] } })
    if (!t.error) transport = (t.data ?? []).flatMap((r) => { try { return [transportFromRow(r)] } catch { return [] } })
  }
  return [...food.map(unifyFood), ...transport.map(unifyTransport)].sort((a, b) => b.displayDate.localeCompare(a.displayDate))
}

// ---- Status change detection (order_status_tracker.dart) ----

const SNAPSHOT_KEY = 'order_status_snapshot_v1'

export function recordOrderStatus(id: string, status: string) {
  save(SNAPSHOT_KEY, { ...load<Record<string, string>>(SNAPSHOT_KEY, {}), [id]: status })
}

/** Orders whose status changed since last seen; remembers the new statuses. */
export function detectStatusChanges(orders: UnifiedOrder[]): { order: UnifiedOrder; previous: string }[] {
  const snap = load<Record<string, string>>(SNAPSHOT_KEY, {})
  const changes = orders.filter((o) => snap[o.id] && snap[o.id] !== o.status).map((o) => ({ order: o, previous: snap[o.id] }))
  save(SNAPSHOT_KEY, { ...snap, ...Object.fromEntries(orders.map((o) => [o.id, o.status])) })
  return changes
}

export const statusLabel = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).replace(/([A-Z])/g, ' $1').toLowerCase() : s)
