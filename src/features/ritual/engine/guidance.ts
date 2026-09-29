import type { TawafGeometry } from './geometry'

export type GuidanceStatus = 'atStart' | 'startAhead' | 'passedStart'

/** What to tell a pilgrim who has not reached the start (tawaf_guidance.dart). */
export const TawafGuidance = {
  /** Generous because phone GPS is rarely better than ±5 m. */
  arrivalRadiusMeters: 6,
  at(geometry: TawafGeometry, lat: number, lng: number): { metresToStart: number; status: GuidanceStatus } {
    const distance = geometry.distanceToStart(lat, lng)
    if (distance <= this.arrivalRadiusMeters) return { metresToStart: distance, status: 'atStart' }
    const angle = geometry.angleFromStartLineDeg(lat, lng)
    return { metresToStart: distance, status: angle > 0 && angle <= 90 ? 'passedStart' : 'startAhead' }
  },
}
