import { destination, type LatLng } from '../../../lib/geo'
import type { TawafGeometry } from './geometry'

/** Small seeded PRNG so simulated walks are repeatable. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Scripted Tawaf walk for Demo mode and tests (tawaf_walk_simulator.dart).
 * Starts opposite the start point, walks anticlockwise to the start line,
 * then 7 laps and a little past, with GPS-like noise.
 */
export const TawafWalkSimulator = {
  walkRadiusMeters: 20,

  radiusFor(geometry: TawafGeometry): number {
    return Math.min(60, Math.max(12, Math.max(geometry.startRadiusMeters, 20)))
  },

  path(geometry: TawafGeometry, opts: { stepMeters?: number; noiseMeters?: number; seed?: number } = {}): LatLng[] {
    const { stepMeters = 1.3, noiseMeters = 2, seed = 7 } = opts
    const radius = this.radiusFor(geometry)
    const stepDeg = ((stepMeters / radius) * 180) / Math.PI
    const totalDeg = 180 + 7 * 360 + 10
    const rng = seededRandom(seed)
    const points: LatLng[] = []
    for (let walked = 0; walked <= totalDeg; walked += stepDeg) {
      const onCircle = geometry.pointAt(geometry.startBearingDeg + 180 - walked, radius)
      points.push(destination(onCircle.lat, onCircle.lng, rng() * 360, rng() * noiseMeters))
    }
    return points
  },
}
