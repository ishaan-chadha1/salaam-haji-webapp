/**
 * Top-down Tawaf diagram: the Kaaba, the lap ring, the Black Stone start line
 * and the pilgrim's position (kaaba_visualization.dart + the start guide).
 * Bearings are compass degrees (0 = north, clockwise).
 */
export function KaabaRing({
  bearing,
  startBearing,
  lapFraction,
  laps,
  totalLaps,
  reachedStart,
  size = 240,
}: {
  bearing: number | null
  startBearing: number
  lapFraction: number
  laps: number
  totalLaps: number
  reachedStart: boolean
  size?: number
}) {
  const c = 120
  const r = 92
  const at = (deg: number, radius: number) => {
    const a = ((deg - 90) * Math.PI) / 180
    return { x: c + radius * Math.cos(a), y: c + radius * Math.sin(a) }
  }
  const start = at(startBearing, r)
  const startOuter = at(startBearing, r + 18)
  const startInner = at(startBearing, 22)
  // Progress arc runs anticlockwise from the start line.
  const frac = Math.min(0.999, reachedStart ? lapFraction : 0)
  const end = at(startBearing - frac * 360, r)
  const large = frac > 0.5 ? 1 : 0
  const user = bearing == null ? null : at(bearing, r)

  return (
    <svg viewBox="0 0 240 240" width={size} height={size} role="img" aria-label={`Lap ${Math.min(laps + 1, totalLaps)} of ${totalLaps}`}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={14} />
      {frac > 0 && (
        <path
          d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`}
          fill="none"
          stroke="var(--gold)"
          strokeWidth={14}
          strokeLinecap="round"
        />
      )}
      {/* Anticlockwise direction hints */}
      {[45, 135, 225, 315].map((d) => {
        const p = at(d, r)
        const rot = d - 180
        return <path key={d} d="M -5 -4 L 3 0 L -5 4" transform={`translate(${p.x} ${p.y}) rotate(${rot})`} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeWidth={2} />
      })}
      <line x1={startInner.x} y1={startInner.y} x2={startOuter.x} y2={startOuter.y} stroke="var(--primary)" strokeWidth={3} strokeDasharray="4 3" />
      <rect x={c - 20} y={c - 20} width={40} height={40} rx={3} fill="#111" transform={`rotate(${startBearing - 135} ${c} ${c})`} />
      <rect x={c - 20} y={c - 11} width={40} height={4} fill="#d4af37" transform={`rotate(${startBearing - 135} ${c} ${c})`} />
      <text x={startOuter.x} y={startOuter.y} dy={startOuter.y > c ? 14 : -6} textAnchor="middle" fontSize={11} fill="currentColor" fillOpacity={0.7}>
        Start
      </text>
      {user && (
        <g>
          <circle cx={user.x} cy={user.y} r={13} fill="var(--primary)" fillOpacity={0.25} />
          <circle cx={user.x} cy={user.y} r={7} fill="var(--primary)" stroke="white" strokeWidth={2} />
        </g>
      )}
    </svg>
  )
}
