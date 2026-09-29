import type { LatLng } from '../../../lib/geo'

/**
 * Accuracy-weighted average of the last few fixes (position_smoother.dart).
 * Phone GPS wanders 3-10 m between fixes; around a ~25 m circle that swings
 * the bearing by tens of degrees. Weights are 1/accuracy².
 */
export class PositionSmoother {
  private fixes: { lat: number; lng: number; accuracy: number; time: number }[] = []
  readonly window: number
  readonly maxGapMs: number

  constructor(window = 3, maxGapMs = 10_000) {
    this.window = window
    this.maxGapMs = maxGapMs
  }

  add(lat: number, lng: number, accuracy: number, time: number): LatLng {
    this.fixes.push({ lat, lng, accuracy, time })
    this.fixes = this.fixes.filter((f) => Math.abs(time - f.time) <= this.maxGapMs)
    while (this.fixes.length > this.window) this.fixes.shift()
    let w = 0
    let la = 0
    let ln = 0
    for (const f of this.fixes) {
      const acc = f.accuracy < 1 ? 1 : f.accuracy
      const weight = 1 / (acc * acc)
      w += weight
      la += f.lat * weight
      ln += f.lng * weight
    }
    return { lat: la / w, lng: ln / w }
  }

  reset() {
    this.fixes = []
  }
}
