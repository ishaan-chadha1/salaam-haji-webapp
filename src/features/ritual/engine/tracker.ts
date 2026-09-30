import { distanceMeters, type LatLng } from '../../../lib/geo'
import { HolySites } from '../../../lib/holySites'
import { FeatureFlags } from '../../../lib/featureFlags'
import { TawafGeometry } from './geometry'
import { TawafGuidance, type GuidanceStatus } from './guidance'
import { TawafLapCounter } from './lapCounter'
import { TawafWalkSimulator } from './simulator'
import { PositionSmoother } from './smoother'

export type Fix = { lat: number; lng: number; accuracy: number; time: number }

// Thresholds from ritual_location_service.dart.
export const RitualLimits = {
  minTawafRadiusMeters: 15,
  maxTawafRadiusMeters: 120,
  maxAcceptableAccuracyMeters: 35,
  averageStepLengthMeters: 0.78,
  saiEndpointThresholdMeters: 10,
  /**
   * Walked distance needed before an endpoint counts as a trip. The Flutter
   * app uses a fixed 220 m, but its Safa/Marwah points are only ~188 m apart,
   * so a single trip could never count there. Use 70% of the real spacing.
   */
  minSaiLapDistanceMeters:
    0.7 * distanceMeters(HolySites.safa.lat, HolySites.safa.lng, HolySites.marwah.lat, HolySites.marwah.lng),
  maxSaiStartDistanceMeters: 120,
}

export type TawafLiveInfo = {
  siteName: string
  guidance: { metresToStart: number; status: GuidanceStatus }
  distanceFromCenter: number
  progressDeg: number
  reachedStart: boolean
  laps: number
  lapFraction: number
  acceptedFixes: number
  rejectedJumps: number
  rejectedAccuracy: number
  direction: number
  accuracy: number
  bearingFromCenter: number
  position: LatLng
  startBearingDeg: number
}

/**
 * The live Tawaf pipeline: accuracy gate → smoothing → lap counter →
 * distance/route → live info. Mirrors RitualLocationService._handleTawafPosition.
 */
export class TawafTracker {
  geometry: TawafGeometry
  counter: TawafLapCounter
  private smoother = new PositionSmoother()
  private last: LatLng | null = null
  route: LatLng[] = []
  totalDistance = 0
  rejectedAccuracy = 0
  live: TawafLiveInfo | null = null

  constructor(geometry: TawafGeometry = TawafGeometry.makkah) {
    this.geometry = geometry
    this.counter = new TawafLapCounter(geometry)
  }

  get steps(): number {
    return Math.round(this.totalDistance / RitualLimits.averageStepLengthMeters)
  }

  reset(geometry = this.geometry) {
    this.geometry = geometry
    this.counter = new TawafLapCounter(geometry)
    this.smoother.reset()
    this.last = null
    this.route = []
    this.totalDistance = 0
    this.rejectedAccuracy = 0
    this.live = null
  }

  /** Returns how many laps this fix completed. */
  handleFix(fix: Fix): number {
    if (fix.accuracy > RitualLimits.maxAcceptableAccuracyMeters) {
      this.rejectedAccuracy++
      this.publish(fix, fix.lat, fix.lng)
      return 0
    }
    const s = this.smoother.add(fix.lat, fix.lng, fix.accuracy, fix.time)
    const fromCenter = this.geometry.distanceFromCenter(s.lat, s.lng)
    if (
      FeatureFlags.enforceTawafProximity &&
      (fromCenter < RitualLimits.minTawafRadiusMeters || fromCenter > RitualLimits.maxTawafRadiusMeters)
    ) {
      this.publish(fix, s.lat, s.lng)
      return 0
    }
    const rejectedBefore = this.counter.rejectedFixes
    const laps = this.counter.addFix(s.lat, s.lng, fix.time)
    const jumped = this.counter.rejectedFixes > rejectedBefore
    if (!jumped) {
      if (!this.last) {
        this.remember(s)
      } else {
        const step = distanceMeters(this.last.lat, this.last.lng, s.lat, s.lng)
        // Ignore sub-metre wobble so standing still adds no distance.
        if (step >= 1) {
          this.totalDistance += step
          this.remember(s)
        }
      }
    }
    this.publish(fix, s.lat, s.lng)
    return laps
  }

  /** Resets and returns a simulated 7-lap walk, one fix per simulated second. */
  prepareSimulation(startTime = Date.now()): Fix[] {
    this.reset()
    return TawafWalkSimulator.path(this.geometry).map((p, i) => ({ ...p, accuracy: 4, time: startTime + (i + 1) * 1000 }))
  }

  /** Route thinned to about [max] points, flattened for storage. */
  thinnedRoute(max = 150): number[] {
    const step = Math.max(1, Math.ceil(this.route.length / max))
    const out: number[] = []
    this.route.forEach((p, i) => {
      if (i % step === 0 || i === this.route.length - 1) out.push(+p.lat.toFixed(6), +p.lng.toFixed(6))
    })
    return out
  }

  private remember(p: LatLng) {
    this.last = p
    this.route.push(p)
  }

  private publish(raw: Fix, lat: number, lng: number) {
    const c = this.counter
    this.live = {
      siteName: this.geometry.name,
      guidance: TawafGuidance.at(this.geometry, lat, lng),
      distanceFromCenter: this.geometry.distanceFromCenter(lat, lng),
      progressDeg: c.progressDeg,
      reachedStart: c.hasReachedStart,
      laps: c.laps,
      lapFraction: c.currentLapFraction,
      acceptedFixes: c.acceptedFixes,
      rejectedJumps: c.rejectedFixes,
      rejectedAccuracy: this.rejectedAccuracy,
      direction: c.lastDirection,
      accuracy: raw.accuracy,
      bearingFromCenter: this.geometry.bearingFromCenter(lat, lng),
      position: { lat, lng },
      startBearingDeg: this.geometry.startBearingDeg,
    }
  }
}

export type SaiLiveInfo = {
  /** 0 = at Safa, 1 = at Marwah. */
  progress: number
  distanceToSafa: number
  distanceToMarwah: number
  accuracy: number
  position: LatLng
  /** 1 = walking towards Marwah, -1 = towards Safa (same as SaiLapCounter). */
  heading: 1 | -1
  /** Share of the current trip walked, 0-1. */
  tripFraction: number
}

/**
 * Sa'i lap detection (RitualLocationService._handleSaiPosition): a lap is
 * arriving within 10 m of Safa or Marwah after walking most of the way
 * ([RitualLimits.minSaiLapDistanceMeters]) and being more than 50 m from where
 * the lap began.
 */
export class SaiTracker {
  private last: LatLng | null = null
  private lapStart: LatLng | null = null
  private lapStartDistance = 0
  totalDistance = 0
  live: SaiLiveInfo | null = null
  route: LatLng[] = []
  private heading: 1 | -1 = 1
  private lastProgress: number | null = null

  get steps(): number {
    return Math.round(this.totalDistance / RitualLimits.averageStepLengthMeters)
  }

  reset() {
    this.last = null
    this.lapStart = null
    this.lapStartDistance = 0
    this.totalDistance = 0
    this.live = null
    this.route = []
    this.heading = 1
    this.lastProgress = null
  }

  handleFix(fix: Fix): number {
    const p = { lat: fix.lat, lng: fix.lng }
    const toSafa = distanceMeters(HolySites.safa.lat, HolySites.safa.lng, p.lat, p.lng)
    const toMarwah = distanceMeters(HolySites.marwah.lat, HolySites.marwah.lng, p.lat, p.lng)
    const sum = toSafa + toMarwah
    const progress = sum < 1 ? 0.5 : toSafa / sum
    if (this.lastProgress == null) this.heading = progress < 0.5 ? 1 : -1
    else if (Math.abs(progress - this.lastProgress) > 0.02) this.heading = progress > this.lastProgress ? 1 : -1
    if (this.lastProgress == null || Math.abs(progress - this.lastProgress) > 0.02) this.lastProgress = progress
    const leg = RitualLimits.minSaiLapDistanceMeters / 0.7
    const tripFraction = Math.min(1, Math.max(0, (this.totalDistance - this.lapStartDistance) / leg))
    this.live = { progress, distanceToSafa: toSafa, distanceToMarwah: toMarwah, accuracy: fix.accuracy, position: p, heading: this.heading, tripFraction }
    if (!this.last) {
      this.last = p
      this.lapStart = p
      this.route.push(p)
      return 0
    }
    const step = distanceMeters(this.last.lat, this.last.lng, p.lat, p.lng)
    if (step < 1) return 0
    this.totalDistance += step
    this.route.push(p)
    this.last = p
    if (this.live) {
      const leg = RitualLimits.minSaiLapDistanceMeters / 0.7
      this.live.tripFraction = Math.min(1, Math.max(0, (this.totalDistance - this.lapStartDistance) / leg))
    }
    const atEnd = toSafa < RitualLimits.saiEndpointThresholdMeters || toMarwah < RitualLimits.saiEndpointThresholdMeters
    const lapDistance = this.totalDistance - this.lapStartDistance
    if (atEnd && lapDistance >= RitualLimits.minSaiLapDistanceMeters && this.lapStart) {
      const fromStart = distanceMeters(this.lapStart.lat, this.lapStart.lng, p.lat, p.lng)
      if (fromStart > 50) {
        this.lapStart = p
        this.lapStartDistance = this.totalDistance
        // At the far hill: the next trip goes back.
        this.heading = toSafa < RitualLimits.saiEndpointThresholdMeters ? 1 : -1
        this.live = { ...this.live, heading: this.heading, tripFraction: 0 }
        return 1
      }
    }
    return 0
  }

  /** Seven one-way trips Safa → Marwah → … with light noise, for Demo mode. */
  static simulatedWalk(startTime = Date.now(), seedOffset = 0): Fix[] {
    const fixes: Fix[] = []
    const { safa, marwah } = HolySites
    const legLength = distanceMeters(safa.lat, safa.lng, marwah.lat, marwah.lng)
    const stepsPerLeg = Math.ceil(legLength / 1.4)
    let t = startTime
    let k = seedOffset
    for (let leg = 0; leg < 7; leg++) {
      const [a, b] = leg % 2 === 0 ? [safa, marwah] : [marwah, safa]
      for (let i = 0; i <= stepsPerLeg; i++) {
        const f = i / stepsPerLeg
        const wobble = Math.sin(k++ * 1.7) * 0.000004
        fixes.push({ lat: a.lat + (b.lat - a.lat) * f + wobble, lng: a.lng + (b.lng - a.lng) * f - wobble, accuracy: 5, time: (t += 1000) })
      }
    }
    return fixes
  }
}
