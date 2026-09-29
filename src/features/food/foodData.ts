// Menus, cities, pickup and pricing rules from lib/src/features/food/.

export type Tier = 'silver' | 'gold'
export type Meal = 'breakfast' | 'lunch' | 'dinner'
export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner']
export const WEEKDAYS: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
export const mealLabel = (m: Meal) => m[0].toUpperCase() + m.slice(1)
export const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

export const SILVER_PER_MEAL_SAR = 26
export const GOLD_FULL_DAY_SAR = 60
export const AZIZIA_SURCHARGE_SAR = 10

export type City = { id: string; name: string; lat: number; lng: number }
export const CITIES: City[] = [
  { id: 'makkah', name: 'Makkah', lat: 21.3891, lng: 39.8579 },
  { id: 'madinah', name: 'Madinah', lat: 24.5247, lng: 39.5692 },
  { id: 'jeddah', name: 'Jeddah', lat: 21.4858, lng: 39.1925 },
  { id: 'riyadh', name: 'Riyadh', lat: 24.7136, lng: 46.6753 },
]

type DayMenu = Record<Meal, string[]>
export type MenuPlan = { tier: Tier; name: string; description: string; color: string; features: string[]; days: Record<Weekday, DayMenu> }

export const MENUS: Record<Tier, MenuPlan> = {
  silver: {
    tier: 'silver',
    name: 'Silver',
    description: 'Pick individual meals (breakfast, lunch, or dinner)',
    color: '#C0C0C0',
    features: ['Pick breakfast, lunch, or dinner per day', 'SAR 26 per meal', 'Ideal when you do not need all three meals'],
    days: {
      monday: { breakfast: ['Roti', 'Kheema', 'Upma'], lunch: ['Roti', 'Rice', 'Dall', 'Mutton Qorma'], dinner: ['Roti', 'Rice', 'Veg Mushakkal', 'Chicken Dry'] },
      tuesday: { breakfast: ['Roti', 'Egg Bhurji', 'Poha'], lunch: ['Chicken Biryani', 'Dall', 'Raita', 'Sweet'], dinner: ['Roti', 'Rice', 'Aloo Palak', 'Mutton Curry'] },
      wednesday: { breakfast: ['Paratha', 'Chana Masala', 'Suji Halwa'], lunch: ['Roti', 'Rice', 'Dall', 'Fish Fry'], dinner: ['Roti', 'Rice', 'Aloo Baingan', 'Chicken Korma'] },
      thursday: { breakfast: ['Roti', 'Paya', 'Khichdi'], lunch: ['Roti', 'Rice', 'Dall', 'Mutton Pepper'], dinner: ['Chapati', 'Rice', 'Kaddu Sabzi', 'Kofta Masala'] },
      friday: { breakfast: ['Puri', 'Aloo Bhaji', 'Suji Halwa'], lunch: ['Mutton Biryani', 'Dall', 'Raita', 'Sweet'], dinner: ['Roti', 'Rice', 'Sabzi', 'Chicken Masala'] },
      saturday: { breakfast: ['Roti', 'Moong Dal Masala', 'Noodles'], lunch: ['Roti', 'Rice', 'Dall', 'Chicken Korma'], dinner: ['Roti', 'Rice', 'Bhindi Sabzi', 'Chicken Butter'] },
      sunday: { breakfast: ['Paratha', 'Kaleji Masala', 'Salad'], lunch: ['Roti', 'Rice', 'Dall', 'Fish Fry'], dinner: ['Roti', 'Rice', 'Lauki Sabzi', 'Mutton Masala'] },
    },
  },
  gold: {
    tier: 'gold',
    name: 'Gold',
    description: 'Full-day plan only (breakfast, lunch, and dinner)',
    color: '#D4AF37',
    features: ['Full day only — all three meals each day', 'SAR 60 per day per person', 'Different menu each day'],
    days: {
      monday: { breakfast: ['Mutton Nihari', 'Boiled Egg', 'Roti', 'Fruits'], lunch: ['Chicken Masala', 'Dal', 'Rice', 'Roti'], dinner: ['Veg Fried Rice', 'Chilli Chicken', 'Veg Sabji', 'Roti'] },
      tuesday: { breakfast: ['Keema Matar', 'Boiled Egg', 'Roti', 'Fruits'], lunch: ['Mutton Khichda', 'Rice', 'Roti', 'Veg Sabji'], dinner: ['Fish Masala', 'Veg Sabji', 'Rice', 'Roti'] },
      wednesday: { breakfast: ['Chole Masala', 'Boiled Egg', 'Roti', 'Fruits'], lunch: ['Chicken Kadai', 'Dal', 'Rice', 'Roti'], dinner: ['Chicken Korma', 'Veg Sabji', 'Rice', 'Roti'] },
      thursday: { breakfast: ['Chicken Aloo', 'Boiled Egg', 'Roti', 'Fruits'], lunch: ['Chicken Pahadi', 'Dal', 'Rice', 'Roti'], dinner: ['Chicken Peshawari', 'Gravy', 'Veg Sabji', 'Rice', 'Roti'] },
      friday: { breakfast: ['Mixed Veg', 'Boiled Egg', 'Roti', 'Fruits'], lunch: ['Chicken Biryani', 'Zarda', 'Cold Drinks', 'Fruits'], dinner: ['Pepper Chicken', 'Veg Sabji', 'Rice', 'Roti'] },
      saturday: { breakfast: ['Keema Masala', 'Boiled Egg', 'Roti', 'Fruits'], lunch: ['Mutton Rogan', 'Dal', 'Rice', 'Roti'], dinner: ['Chicken Shahi Korma', 'Veg Sabji', 'Rice', 'Roti'] },
      sunday: { breakfast: ['Aloo Matar', 'Boiled Egg', 'Roti', 'Fruits'], lunch: ['Chicken Angara', 'Dal', 'Rice', 'Roti'], dinner: ['Mutton Bhuna', 'Veg Sabji', 'Rice', 'Roti'] },
    },
  },
}

export const TIME_SLOTS = [
  { id: 'morning', name: 'Morning', label: 'Morning (6:00 AM - 12:00 PM)' },
  { id: 'afternoon', name: 'Afternoon', label: 'Afternoon (12:00 PM - 5:00 PM)' },
  { id: 'evening', name: 'Evening', label: 'Evening (5:00 PM - 9:00 PM)' },
  { id: 'night', name: 'Night', label: 'Night (9:00 PM - 11:59 PM)' },
]
export const ALL_WINDOWS_ID = 'all_windows'

export type PickupPoint = { id: string; name: string; address: string; lat: number; lng: number; distanceKm: number; phone: string }

/** Mock pickup points around the hotel, as in pickup_point.dart. */
export function nearbyPickupPoints(lat: number, lng: number, city: string): PickupPoint[] {
  return [
    { id: '1', name: 'Central Pickup Point', address: `Near Grand Mosque, ${city}`, lat: lat + 0.01, lng: lng + 0.01, distanceKm: 0.5, phone: '+966501234567' },
    { id: '2', name: 'Hotel District Pickup', address: `Hotel Zone, ${city}`, lat: lat + 0.005, lng: lng + 0.005, distanceKm: 0.3, phone: '+966501234568' },
    { id: '3', name: 'Main Square Pickup', address: `Main Square, ${city}`, lat: lat - 0.01, lng: lng - 0.01, distanceKm: 0.8, phone: '+966501234569' },
  ].sort((a, b) => a.distanceKm - b.distanceKm)
}

export const PICKUP_NOTICE = 'Meals are not delivered. Collect your order at your chosen pickup point during any of the fixed time windows shown.'

// ---- Meal rules (food_meal_rules.dart) ----

export type Selection = { date: string; meal: Meal; tier: Tier } // date = yyyy-mm-dd

export type MealPlanInput = {
  selections: Selection[]
  startDate: string | null
  endDate: string | null
  firstMeal: Meal | null
  lastMeal: Meal | null
  cityId: string | null
  isInAzizia: boolean | null
}

const mealOrder = (m: Meal) => MEALS.indexOf(m)

export function weekdayOf(date: string): Weekday {
  const d = new Date(date + 'T12:00:00')
  return WEEKDAYS[(d.getDay() + 6) % 7]
}

export function datesBetween(start: string, end: string): string[] {
  const out: string[] = []
  const d = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  while (d <= e) {
    out.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return out
}

export function inTripWindow(s: { date: string; meal: Meal }, p: Pick<MealPlanInput, 'startDate' | 'endDate' | 'firstMeal' | 'lastMeal'>): boolean {
  if (!p.startDate || !p.endDate) return true
  if (s.date !== p.startDate && s.date !== p.endDate) return true
  if (s.date === p.startDate && p.firstMeal) return mealOrder(s.meal) >= mealOrder(p.firstMeal)
  if (s.date === p.endDate && p.lastMeal) return mealOrder(s.meal) <= mealOrder(p.lastMeal)
  return true
}

const isFullDay = (meals: Meal[]) => new Set(meals).size === 3

export function goldFullDayAvailable(date: string, p: MealPlanInput): boolean {
  if (!p.startDate || !p.endDate) return false
  return MEALS.every((meal) => inTripWindow({ date, meal }, p))
}

export function byDay(selections: Selection[]): Map<string, Selection[]> {
  const m = new Map<string, Selection[]>()
  for (const s of selections) m.set(s.date, [...(m.get(s.date) ?? []), s])
  return m
}

/** Silver only — per-meal toggle; replaces Gold on that day. */
export function toggleSilverMeal(p: MealPlanInput, date: string, meal: Meal): Selection[] {
  let sel = p.selections.filter((s) => !(s.date === date && s.tier === 'gold'))
  const exists = sel.some((s) => s.date === date && s.meal === meal)
  sel = sel.filter((s) => !(s.date === date && s.meal === meal))
  if (!exists) sel.push({ date, meal, tier: 'silver' })
  return sel
}

/** Gold full-day toggle for a date. */
export function toggleGoldDay(p: MealPlanInput, date: string): Selection[] {
  const day = p.selections.filter((s) => s.date === date)
  const isGoldDay = day.length > 0 && day.every((s) => s.tier === 'gold') && isFullDay(day.map((s) => s.meal))
  const rest = p.selections.filter((s) => s.date !== date)
  if (isGoldDay) return rest
  if (!goldFullDayAvailable(date, p)) return p.selections
  return [...rest, ...MEALS.map((meal) => ({ date, meal, tier: 'gold' as Tier }))]
}

export function goldAllDays(p: MealPlanInput): Selection[] {
  if (!p.startDate || !p.endDate) return p.selections
  return datesBetween(p.startDate, p.endDate).flatMap((date) => (goldFullDayAvailable(date, p) ? MEALS.map((meal) => ({ date, meal, tier: 'gold' as Tier })) : []))
}

export function pruneToWindow(p: MealPlanInput): Selection[] {
  return p.selections.filter((s) => inTripWindow(s, p))
}

export function hasValidSelections(p: MealPlanInput): boolean {
  if (p.selections.length === 0) return false
  for (const day of byDay(p.selections).values()) {
    const tiers = new Set(day.map((s) => s.tier))
    if (tiers.size > 1) return false
    if (day[0].tier === 'gold' && !isFullDay(day.map((s) => s.meal))) return false
  }
  if (p.startDate && p.endDate && !p.firstMeal) return false
  return p.selections.every((s) => inTripWindow(s, p))
}

export function subtotals(p: MealPlanInput): { meal: number; azizia: number } {
  let meal = 0
  let goldDays = 0
  let hasSilver = false
  for (const day of byDay(p.selections).values()) {
    if (day[0].tier === 'gold') {
      if (isFullDay(day.map((s) => s.meal))) {
        meal += GOLD_FULL_DAY_SAR
        goldDays++
      }
    } else {
      meal += day.length * SILVER_PER_MEAL_SAR
      hasSilver = true
    }
  }
  let azizia = 0
  if (p.cityId === 'makkah' && p.isInAzizia === true) {
    azizia = goldDays * AZIZIA_SURCHARGE_SAR + (hasSilver ? AZIZIA_SURCHARGE_SAR : 0)
  }
  return { meal, azizia }
}

/** (meals + area surcharge) × people. */
export function orderTotal(p: MealPlanInput, pax: number): number {
  const { meal, azizia } = subtotals(p)
  return (meal + azizia) * Math.max(1, pax)
}

export type DaySummary = { date: string; tier: Tier; meals: Meal[]; isFullDay: boolean; subtotal: number }

export function daySummaries(p: MealPlanInput): DaySummary[] {
  if (!p.startDate || !p.endDate) return []
  const days = byDay(p.selections)
  return datesBetween(p.startDate, p.endDate).flatMap((date) => {
    const day = days.get(date)
    if (!day?.length) return []
    const meals = day.map((s) => s.meal).sort((a, b) => mealOrder(a) - mealOrder(b))
    const full = day[0].tier === 'gold' && isFullDay(meals)
    return [{ date, tier: day[0].tier, meals, isFullDay: full, subtotal: full ? GOLD_FULL_DAY_SAR : day.length * SILVER_PER_MEAL_SAR }]
  })
}

export const ENQUIRY_DISCLAIMER = [
  'Enquiries are subject to availability and confirmation by our team',
  'Estimated prices and options may change until a representative confirms',
  'Cancellations and changes are handled per our policy',
  'We will contact you using the details you provide',
  'Please ensure all information is accurate before submitting',
]

export const formatSar = (n: number) => `SAR ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
