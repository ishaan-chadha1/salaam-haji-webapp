// Great-circle helpers shared by Tawaf, Sa'i, Qibla and family maps.

export type LatLng = { lat: number; lng: number }

const R = 6371000
const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

/** Great-circle distance in metres. */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dPhi = rad(lat2 - lat1)
  const dLng = rad(lng2 - lng1)
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Initial bearing from point 1 to point 2, 0-360° clockwise from north. */
export function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const phi1 = rad(lat1)
  const phi2 = rad(lat2)
  const dLng = rad(lng2 - lng1)
  const y = Math.sin(dLng) * Math.cos(phi2)
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng)
  return (deg(Math.atan2(y, x)) + 360) % 360
}

/** Point [distanceM] metres from (lat, lng) at [bearing]. */
export function destination(lat: number, lng: number, bearing: number, distanceM: number): LatLng {
  const d = distanceM / R
  const b = rad(bearing)
  const lat1 = rad(lat)
  const lng1 = rad(lng)
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b))
  const lng2 = lng1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2))
  return { lat: deg(lat2), lng: deg(lng2) }
}

/** Normalises an angle to (-180, 180]. */
export function normalizeSignedDeg(value: number): number {
  let v = value % 360
  if (v > 180) v -= 360
  if (v <= -180) v += 360
  return v
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`
  if (m < 100000) return `${(m / 1000).toFixed(1)} km`
  return `${Math.round(m / 1000).toLocaleString()} km`
}
