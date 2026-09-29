import { distanceMeters, normalizeSignedDeg } from '../../../lib/geo'
import { TawafGeometry } from './geometry'

/**
 * Counts Tawaf laps from (smoothed) GPS fixes. Port of tawaf_lap_counter.dart.
 *
 * Tracks cumulative anticlockwise rotation around the centre ("progress",
 * degrees from the start line) and completes a lap each time progress passes
 * a new multiple of 360. A high-water mark means pacing back and forth never
 * counts twice, and walking clockwise never counts at all. Lap 1 only begins
 * once the pilgrim reaches the start line.
 */
export class TawafLapCounter {
  static readonly defaultStartSectorHalfWidthDeg = 20
  /** Net rotation needed before [lastDirection] changes (ignores drift). */
  private static readonly directionThresholdDeg = 8

  readonly geometry: TawafGeometry
  readonly startSectorHalfWidthDeg: number
  /** Faster than this is treated as a GPS jump. Brisk ramal is ~2-2.5 m/s. */
  readonly maxWalkingSpeedMps: number

  private lastBearing: number | null = null
  private lastLat = 0
  private lastLng = 0
  private lastTime = 0
  private progress = 0
  private highestBoundary = 0
  private reachedStart = false
  private lapCount = 0
  private accepted = 0
  private rejected = 0
  private direction = 0
  private directionAccumulator = 0

  constructor(geometry: TawafGeometry, opts: { startSectorHalfWidthDeg?: number; maxWalkingSpeedMps?: number } = {}) {
    this.geometry = geometry
    this.startSectorHalfWidthDeg = opts.startSectorHalfWidthDeg ?? TawafLapCounter.defaultStartSectorHalfWidthDeg
    this.maxWalkingSpeedMps = opts.maxWalkingSpeedMps ?? 4
  }

  static anchoredToBlackStone(): TawafLapCounter {
    return new TawafLapCounter(TawafGeometry.makkah)
  }

  static get blackStoneBearingDeg(): number {
    return TawafGeometry.makkah.startBearingDeg
  }

  get laps() { return this.lapCount }
  get hasReachedStart() { return this.reachedStart }
  get progressDeg() { return this.progress }
  get acceptedFixes() { return this.accepted }
  get rejectedFixes() { return this.rejected }
  /** 1 = anticlockwise (correct), -1 = clockwise (wrong way), 0 = unknown. */
  get lastDirection() { return this.direction }

  /** Fraction (0-1) of the current lap walked. */
  get currentLapFraction(): number {
    if (!this.reachedStart) return 0
    return Math.min(1, Math.max(0, (this.progress - this.highestBoundary * 360) / 360))
  }

  /** Degrees still to walk anticlockwise before lap 1 begins. */
  get degreesToStart(): number {
    if (this.reachedStart || this.lastBearing == null) return 0
    return Math.min(360, Math.max(0, (this.highestBoundary + 1) * 360 - this.progress))
  }

  isInStartSector(lat: number, lng: number): boolean {
    return Math.abs(this.geometry.angleFromStartLineDeg(lat, lng)) <= this.startSectorHalfWidthDeg
  }

  angleFromStartLineDeg(lat: number, lng: number): number {
    return this.geometry.angleFromStartLineDeg(lat, lng)
  }

  /** Feeds one fix ([timeMs] epoch ms). Returns laps this fix completed. */
  addFix(lat: number, lng: number, timeMs: number): number {
    const bearing = this.geometry.bearingFromCenter(lat, lng)

    if (this.lastBearing == null) {
      this.progress = this.geometry.angleFromStartLineDeg(lat, lng)
      this.highestBoundary = Math.floor(this.progress / 360)
      this.reachedStart = this.progress >= 0 && this.progress <= this.startSectorHalfWidthDeg
      this.accepted++
      this.remember(bearing, lat, lng, timeMs)
      return 0
    }

    // A fix no newer than the last is judged as if a second apart.
    let seconds = (timeMs - this.lastTime) / 1000
    if (seconds <= 0) seconds = 1
    const metres = distanceMeters(this.lastLat, this.lastLng, lat, lng)
    if (metres / seconds > this.maxWalkingSpeedMps) {
      this.rejected++
      return 0
    }

    // Bearing decreases when walking anticlockwise, so negate for progress.
    const delta = -normalizeSignedDeg(bearing - this.lastBearing)
    this.progress += delta
    this.directionAccumulator += delta
    if (Math.abs(this.directionAccumulator) >= TawafLapCounter.directionThresholdDeg) {
      this.direction = this.directionAccumulator > 0 ? 1 : -1
      this.directionAccumulator = 0
    }
    this.accepted++
    this.remember(bearing, lat, lng, timeMs)

    const boundary = Math.floor(this.progress / 360)
    if (!this.reachedStart && boundary < this.highestBoundary) {
      // Walked back behind the start line before starting: follow them down.
      this.highestBoundary = boundary
      return 0
    }

    let completed = 0
    while (this.highestBoundary < boundary) {
      this.highestBoundary++
      if (this.reachedStart) {
        this.lapCount++
        completed++
      } else {
        this.reachedStart = true
      }
    }
    return completed
  }

  /** Adds a lap without a GPS crossing (the manual +1 button). */
  addManualLap(): void {
    this.reachedStart = true
    this.lapCount++
  }

  private remember(bearing: number, lat: number, lng: number, time: number) {
    this.lastBearing = bearing
    this.lastLat = lat
    this.lastLng = lng
    this.lastTime = time
  }
}
