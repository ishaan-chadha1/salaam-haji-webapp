import { bearingDeg, distanceMeters } from '../../../lib/geo'

/** Small top-down ring map of a recorded Tawaf route (history_ring_map.dart). */
export function HistoryRing({ route, site, size = 88 }: { route: number[]; site: number[]; size?: number }) {
  const [cLat, cLng, sLat, sLng] = site
  const pts: { b: number; d: number }[] = []
  for (let i = 0; i + 1 < route.length; i += 2) {
    pts.push({ b: bearingDeg(cLat, cLng, route[i], route[i + 1]), d: distanceMeters(cLat, cLng, route[i], route[i + 1]) })
  }
  const maxD = Math.max(25, ...pts.map((p) => p.d))
  const c = 50
  const scale = 42 / maxD
  const xy = (b: number, d: number) => {
    const a = ((b - 90) * Math.PI) / 180
    return `${(c + d * scale * Math.cos(a)).toFixed(1)},${(c + d * scale * Math.sin(a)).toFixed(1)}`
  }
  const startB = bearingDeg(cLat, cLng, sLat, sLng)
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="shrink-0 rounded-xl bg-surface-2">
      <rect x={c - 5} y={c - 5} width={10} height={10} fill="#111" />
      <polyline points={pts.map((p) => xy(p.b, p.d)).join(' ')} fill="none" stroke="var(--gold)" strokeWidth={1.5} strokeLinejoin="round" />
      <line x1={c} y1={c} x2={xy(startB, maxD).split(',')[0]} y2={xy(startB, maxD).split(',')[1]} stroke="var(--primary)" strokeWidth={1.5} strokeDasharray="3 2" />
    </svg>
  )
}
