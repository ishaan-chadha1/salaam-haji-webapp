import { create } from 'zustand'
import { HolySites } from '../lib/holySites'
import { load, save } from '../lib/storage'

export type Place = { lat: number; lng: number; label: string; isFallback: boolean }

type LocationState = {
  place: Place
  status: 'idle' | 'locating' | 'ok' | 'denied' | 'unavailable'
  /** Asks the browser once. Never blocks the app (TabScreen "never lock over location"). */
  locate: () => Promise<void>
}

const KEY = 'last_location_v1'
const makkah: Place = { ...HolySites.kaaba, label: 'Makkah (default)', isFallback: true }

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${lat}&lon=${lng}`,
      { headers: { Accept: 'application/json' } },
    )
    const j = await res.json()
    const a = j.address ?? {}
    const city = a.city ?? a.town ?? a.village ?? a.county ?? a.state
    return [city, a.country].filter(Boolean).join(', ') || 'Current location'
  } catch {
    return 'Current location'
  }
}

export const useLocation = create<LocationState>((set, get) => ({
  place: load<Place>(KEY, makkah),
  status: 'idle',
  locate: async () => {
    if (get().status === 'locating') return
    if (!('geolocation' in navigator)) return set({ status: 'unavailable' })
    set({ status: 'locating' })
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        const label = await reverseGeocode(lat, lng)
        const place = { lat, lng, label, isFallback: false }
        save(KEY, place)
        set({ place, status: 'ok' })
      },
      (err) => set({ status: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
    )
  },
}))
