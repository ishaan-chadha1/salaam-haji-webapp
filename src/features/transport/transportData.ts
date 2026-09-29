// Routes, vehicles and fixed pricing from lib/src/features/transport/.

export type EndpointType = 'airport' | 'hotel' | 'trainStation' | 'ziyarat' | 'city'
export type Endpoint = { id: string; label: string; type: EndpointType }
export type Route = { id: string; code: string; name: string; fromCity: string; toCity: string; pickup: Endpoint[]; dropoff: Endpoint[] }

const jeddahAirport: Endpoint = { id: 'jeddah_airport', label: 'Jeddah Airport', type: 'airport' }
const madinahAirport: Endpoint = { id: 'madinah_airport', label: 'Madinah Airport', type: 'airport' }
const makkahHotel: Endpoint = { id: 'makkah_hotel_zone', label: 'Makkah Hotel Zone', type: 'hotel' }
const madinahHotel: Endpoint = { id: 'madinah_hotel_zone', label: 'Madinah Hotel Zone', type: 'hotel' }
const makkahTrain: Endpoint = { id: 'makkah_train_station', label: 'Makkah Train Station', type: 'trainStation' }
const madinahTrain: Endpoint = { id: 'madinah_train_station', label: 'Madinah Train Station', type: 'trainStation' }
const taif: Endpoint = { id: 'taif_city', label: 'Taif', type: 'city' }
const makkahZiyarat: Endpoint = { id: 'makkah_ziyarat', label: 'Makkah Ziyarat', type: 'ziyarat' }
const madinahZiyarat: Endpoint = { id: 'madinah_ziyarat', label: 'Madinah Ziyarat', type: 'ziyarat' }
const badar: Endpoint = { id: 'badar_city', label: 'Badar', type: 'city' }
const khyber: Endpoint = { id: 'khyber_city', label: 'Khyber', type: 'city' }

export const ROUTES: Route[] = [
  { id: 'jed_airport_to_makkah_hotel', code: '01', name: 'Jeddah Airport → Makkah Hotel', fromCity: 'Jeddah', toCity: 'Makkah', pickup: [jeddahAirport], dropoff: [makkahHotel] },
  { id: 'jed_airport_to_madinah_hotel', code: '02', name: 'Jeddah Airport → Madinah Hotel', fromCity: 'Jeddah', toCity: 'Madinah', pickup: [jeddahAirport], dropoff: [madinahHotel] },
  { id: 'makkah_hotel_to_jed_airport', code: '03', name: 'Makkah Hotel → Jeddah Airport', fromCity: 'Makkah', toCity: 'Jeddah', pickup: [makkahHotel], dropoff: [jeddahAirport] },
  { id: 'makkah_hotel_to_madinah_hotel', code: '04', name: 'Makkah Hotel → Madinah Hotel', fromCity: 'Makkah', toCity: 'Madinah', pickup: [makkahHotel], dropoff: [madinahHotel] },
  { id: 'makkah_hotel_to_taif_rt', code: '05', name: 'Makkah Hotel → Taif (RT)', fromCity: 'Makkah', toCity: 'Taif', pickup: [makkahHotel], dropoff: [taif] },
  { id: 'makkah_hotel_to_makkah_ziyarat', code: '06', name: 'Makkah Hotel → Makkah Ziyarat', fromCity: 'Makkah', toCity: 'Makkah', pickup: [makkahHotel], dropoff: [makkahZiyarat] },
  { id: 'madinah_hotel_to_jed_airport', code: '07', name: 'Madinah Hotel → Jeddah Airport', fromCity: 'Madinah', toCity: 'Jeddah', pickup: [madinahHotel], dropoff: [jeddahAirport] },
  { id: 'madinah_hotel_to_madinah_ziyarat', code: '08', name: 'Madinah Hotel → Madinah Ziyarat', fromCity: 'Madinah', toCity: 'Madinah', pickup: [madinahHotel], dropoff: [madinahZiyarat] },
  { id: 'madinah_hotel_to_madinah_airport', code: '09', name: 'Madinah Hotel → Madinah Airport', fromCity: 'Madinah', toCity: 'Madinah', pickup: [madinahHotel], dropoff: [madinahAirport] },
  { id: 'madinah_hotel_to_makkah_hotel', code: '10', name: 'Madinah Hotel → Makkah Hotel', fromCity: 'Madinah', toCity: 'Makkah', pickup: [madinahHotel], dropoff: [makkahHotel] },
  { id: 'madinah_airport_to_madinah_hotel', code: '11', name: 'Madinah Airport → Madinah Hotel', fromCity: 'Madinah', toCity: 'Madinah', pickup: [madinahAirport], dropoff: [madinahHotel] },
  { id: 'makkah_train_pick_drop', code: '12', name: 'Makkah Train Pick & Drop', fromCity: 'Makkah', toCity: 'Makkah', pickup: [makkahTrain, makkahHotel], dropoff: [makkahTrain, makkahHotel] },
  { id: 'madinah_train_pick_drop', code: '13', name: 'Madinah Train Pick & Drop', fromCity: 'Madinah', toCity: 'Madinah', pickup: [madinahTrain, madinahHotel], dropoff: [madinahTrain, madinahHotel] },
  { id: 'madinah_badar_rt', code: '14', name: 'Madinah → Badar → Madinah (RT)', fromCity: 'Madinah', toCity: 'Badar', pickup: [madinahHotel], dropoff: [badar] },
  { id: 'madinah_khyber_rt', code: '15', name: 'Madinah → Khyber → Madinah (RT)', fromCity: 'Madinah', toCity: 'Khyber', pickup: [madinahHotel], dropoff: [khyber] },
]

export const POPULAR_ROUTE_IDS = [
  'jed_airport_to_makkah_hotel',
  'jed_airport_to_madinah_hotel',
  'madinah_hotel_to_makkah_hotel',
  'makkah_hotel_to_jed_airport',
  'madinah_hotel_to_jed_airport',
  'madinah_airport_to_madinah_hotel',
]

export type Vehicle = { id: string; name: string; maxPassengers: number; maxBags: number; ratePerKm: number; description: string; emoji: string }

export const VEHICLES: Vehicle[] = [
  { id: 'sedan_standard', name: 'Standard Sedan', maxPassengers: 4, maxBags: 2, ratePerKm: 15, description: 'Comfortable sedan for small groups', emoji: '🚗' },
  { id: 'suv_standard', name: 'Standard SUV', maxPassengers: 6, maxBags: 4, ratePerKm: 20, description: 'Spacious SUV for families', emoji: '🚙' },
  { id: 'van_standard', name: 'Van', maxPassengers: 8, maxBags: 6, ratePerKm: 25, description: 'Large van for bigger groups', emoji: '🚐' },
  { id: 'bus_standard', name: 'Mini Bus', maxPassengers: 15, maxBags: 10, ratePerKm: 35, description: 'Mini bus for large groups', emoji: '🚌' },
  { id: 'luxury_sedan', name: 'Luxury Sedan', maxPassengers: 4, maxBags: 3, ratePerKm: 40, description: 'Premium luxury sedan', emoji: '🚘' },
]

export type EnquiryType = 'transfer' | 'dayTour' | 'custom'
export type TourDuration = 'halfDay' | 'fullDay'

const ROUTE_BASE_SAR: Record<string, number> = {
  jed_airport_to_makkah_hotel: 180,
  jed_airport_to_madinah_hotel: 450,
  makkah_hotel_to_jed_airport: 180,
  makkah_hotel_to_madinah_hotel: 400,
  madinah_hotel_to_jed_airport: 450,
  madinah_airport_to_madinah_hotel: 120,
  makkah_hotel_to_taif_rt: 280,
  makkah_hotel_to_makkah_ziyarat: 150,
  madinah_hotel_to_madinah_ziyarat: 150,
  madinah_hotel_to_makkah_hotel: 400,
  makkah_train_pick_drop: 80,
  madinah_train_pick_drop: 80,
  madinah_badar_rt: 500,
  madinah_khyber_rt: 450,
}

/** Sedan base per route (SAR); other vehicles scale by their rate (transport_pricing.dart). */
export function priceFor(p: { enquiryType: EnquiryType; tourDuration: TourDuration; routeId: string | null }, vehicle: Vehicle): number {
  if (p.enquiryType === 'custom') return 0
  const base = p.enquiryType === 'dayTour' ? (p.tourDuration === 'halfDay' ? 200 : 350) : (ROUTE_BASE_SAR[p.routeId ?? ''] ?? 200)
  return base * (vehicle.ratePerKm / 15)
}

export function tourRoute(city: 'Makkah' | 'Madinah', duration: TourDuration): Route {
  const hotel: Endpoint = { id: `${city.toLowerCase()}_hotel_zone`, label: `${city} Hotel Zone`, type: 'hotel' }
  return {
    id: `${duration === 'halfDay' ? 'half_day_tour' : 'day_tour'}_${city.toLowerCase()}`,
    code: duration === 'halfDay' ? 'HD' : 'FD',
    name: `${city} ${duration === 'halfDay' ? 'Half-Day Tour (4 Hours)' : 'Full-Day Tour (8 Hours)'}`,
    fromCity: city,
    toCity: city,
    pickup: [hotel],
    dropoff: [hotel],
  }
}

export function routeName(id: string): string {
  const r = ROUTES.find((x) => x.id === id)
  if (r) return r.name
  if (id.startsWith('half_day_tour_')) return `${capCity(id.slice(14))} Half-Day Tour`
  if (id.startsWith('day_tour_')) return `${capCity(id.slice(9))} Full-Day Tour`
  if (id === 'custom_enquiry') return 'Custom enquiry'
  return id
}
const capCity = (s: string) => s[0].toUpperCase() + s.slice(1)
