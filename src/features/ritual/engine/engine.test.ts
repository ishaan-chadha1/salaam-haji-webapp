import { describe, expect, it, test } from 'vitest'
import { destination } from '../../../lib/geo'
import { HolySites } from '../../../lib/holySites'
import { TawafGeometry } from './geometry'
import { TawafLapCounter } from './lapCounter'
import { seededRandom, TawafWalkSimulator } from './simulator'
import { SaiTracker, TawafTracker } from './tracker'

// Port of test/tawaf_lap_counter_test.dart and tawaf_simulator_test.dart.

const pointAt = (bearing: number, distanceM: number) => destination(HolySites.kaaba.lat, HolySites.kaaba.lng, bearing, distanceM)
const t0 = Date.UTC(2026, 9, 18, 5, 0)
type F = { lat: number; lng: number; time: number }

function walk(o: { laps: number; radiusM?: number; startOffsetDeg?: number; stepM?: number; anticlockwise?: boolean; jitterM?: number; seed?: number; overshootDeg?: number }): F[] {
  const { laps, radiusM = 20, startOffsetDeg = 0, stepM = 2, anticlockwise = true, jitterM = 0, seed = 1, overshootDeg = 3 } = o
  const rng = seededRandom(seed)
  const start = TawafLapCounter.blackStoneBearingDeg
  const stepDeg = ((stepM / radiusM) * 180) / Math.PI
  const totalDeg = laps * 360 + overshootDeg
  const n = Math.ceil(totalDeg / stepDeg)
  const fixes: F[] = []
  for (let i = 0; i <= n; i++) {
    const walked = Math.min(i * stepDeg, totalDeg)
    const bearing = start - startOffsetDeg + (anticlockwise ? -1 : 1) * walked
    const r = radiusM + (jitterM === 0 ? 0 : (rng() * 2 - 1) * jitterM)
    const p = pointAt(bearing, r)
    fixes.push({ ...p, time: t0 + Math.round(((i * stepM) / 1.3) * 1000) })
  }
  return fixes
}

const feed = (c: TawafLapCounter, fixes: F[]) => fixes.reduce((n, f) => n + c.addFix(f.lat, f.lng, f.time), 0)

test('Black Stone is ~10 m from the Kaaba centre at ~105°', () => {
  expect(TawafLapCounter.blackStoneBearingDeg).toBeCloseTo(105.4, 0)
  expect(Math.abs(TawafGeometry.makkah.startRadiusMeters - 10)).toBeLessThan(0.3)
})

describe('counts real laps', () => {
  for (const radius of [12, 20, 35, 60]) {
    test(`7 anticlockwise laps from the Black Stone at ${radius}m`, () => {
      const c = TawafLapCounter.anchoredToBlackStone()
      expect(feed(c, walk({ laps: 7, radiusM: radius }))).toBe(7)
      expect(c.laps).toBe(7)
    })
  }
  test('6.5 laps counts 6', () => {
    expect(feed(TawafLapCounter.anchoredToBlackStone(), walk({ laps: 6.5 }))).toBe(6)
  })
  test('each lap completes at the Black Stone line', () => {
    const c = TawafLapCounter.anchoredToBlackStone()
    for (const f of walk({ laps: 7 })) {
      if (c.addFix(f.lat, f.lng, f.time) > 0) expect(Math.abs(c.angleFromStartLineDeg(f.lat, f.lng))).toBeLessThan(8)
    }
    expect(c.laps).toBe(7)
  })
})

describe('anchoring to the Black Stone', () => {
  test('starting just before the line: reaching it is not a lap', () => {
    expect(feed(TawafLapCounter.anchoredToBlackStone(), walk({ laps: 7 + 10 / 360, startOffsetDeg: -10 }))).toBe(7)
  })
  test('starting on the far side: arrive at the stone first, then count', () => {
    const c = TawafLapCounter.anchoredToBlackStone()
    expect(c.hasReachedStart).toBe(false)
    expect(feed(c, walk({ laps: 7.5, startOffsetDeg: 180 }))).toBe(7)
    expect(c.hasReachedStart).toBe(true)
  })
  test('degreesToStart counts down to the Black Stone, then stays 0', () => {
    const c = TawafLapCounter.anchoredToBlackStone()
    const fixes = walk({ laps: 1.5, startOffsetDeg: 90 })
    c.addFix(fixes[0].lat, fixes[0].lng, fixes[0].time)
    expect(Math.abs(c.degreesToStart - 270)).toBeLessThan(1)
    for (const f of fixes.slice(1)) c.addFix(f.lat, f.lng, f.time)
    expect(c.hasReachedStart).toBe(true)
    expect(c.degreesToStart).toBe(0)
  })
  test('half a lap from the far side is not a lap', () => {
    const c = TawafLapCounter.anchoredToBlackStone()
    expect(feed(c, walk({ laps: 0.6, startOffsetDeg: 180 }))).toBe(0)
    expect(c.hasReachedStart).toBe(true)
  })
  test('start sector is ±20° of the line', () => {
    const c = TawafLapCounter.anchoredToBlackStone()
    const s = TawafLapCounter.blackStoneBearingDeg
    const inside = pointAt(s - 15, 20)
    const outside = pointAt(s - 40, 20)
    expect(c.isInStartSector(inside.lat, inside.lng)).toBe(true)
    expect(c.isInStartSector(outside.lat, outside.lng)).toBe(false)
  })
})

describe('does not count what is not a lap', () => {
  test('walking clockwise counts nothing', () => {
    expect(feed(TawafLapCounter.anchoredToBlackStone(), walk({ laps: 7, anticlockwise: false }))).toBe(0)
  })
  test('standing still with GPS noise for 10 minutes counts nothing', () => {
    const c = TawafLapCounter.anchoredToBlackStone()
    const rng = seededRandom(42)
    const s = TawafLapCounter.blackStoneBearingDeg
    let total = 0
    for (let i = 0; i < 600; i++) {
      const p = pointAt(s + (rng() * 2 - 1) * 12, 20 + (rng() * 2 - 1) * 4)
      total += c.addFix(p.lat, p.lng, t0 + i * 1000)
    }
    expect(total).toBe(0)
  })
  test('pacing back and forth across the line never double counts', () => {
    const c = TawafLapCounter.anchoredToBlackStone()
    const s = TawafLapCounter.blackStoneBearingDeg
    let total = 0
    let i = 0
    for (let rep = 0; rep < 20; rep++) {
      for (const off of [-10, -5, 0, 5, 10, 5, 0, -5]) {
        const p = pointAt(s - off, 20)
        total += c.addFix(p.lat, p.lng, t0 + i++ * 1000)
      }
    }
    expect(total).toBe(0)
  })
  test('a single GPS jump across the Kaaba is ignored', () => {
    const c = TawafLapCounter.anchoredToBlackStone()
    const fixes = walk({ laps: 3 })
    const at = Math.floor(fixes.length / 2)
    const far = pointAt(TawafLapCounter.blackStoneBearingDeg + 150, 20)
    fixes.splice(at, 0, { ...far, time: fixes[at].time - 500 })
    expect(feed(c, fixes)).toBe(3)
  })
  test('noisy but real 7 laps still count 7', () => {
    expect(feed(TawafLapCounter.anchoredToBlackStone(), walk({ laps: 7.05, jitterM: 3, seed: 7 }))).toBe(7)
  })
})

test('manual +1 keeps the count consistent with GPS laps', () => {
  const c = TawafLapCounter.anchoredToBlackStone()
  feed(c, walk({ laps: 2.2 }))
  c.addManualLap()
  expect(c.laps).toBe(3)
})

describe('simulated walk through the full pipeline', () => {
  test('counts 7 laps around the Kaaba', () => {
    const t = new TawafTracker()
    const laps = t.prepareSimulation().reduce((n, f) => n + t.handleFix(f), 0)
    expect(laps).toBe(7)
    expect(t.counter.laps).toBe(7)
  })
  test('counts 7 laps after a real fix far from the site', () => {
    const t = new TawafTracker()
    t.handleFix({ lat: 12.97, lng: 77.59, accuracy: 8, time: Date.now() })
    const laps = t.prepareSimulation().reduce((n, f) => n + t.handleFix(f), 0)
    expect(laps).toBe(7)
    expect(t.counter.rejectedFixes).toBe(0)
    expect(t.totalDistance).toBeLessThan(1500)
  })
  test('walks ~20 m out around the real Kaaba', () => {
    const g = TawafGeometry.makkah
    expect(TawafWalkSimulator.radiusFor(g)).toBe(20)
    for (const p of TawafWalkSimulator.path(g)) {
      const d = g.distanceFromCenter(p.lat, p.lng)
      expect(d).toBeGreaterThanOrEqual(17)
      expect(d).toBeLessThanOrEqual(23)
    }
  })
  test('imprecise fixes are shown but not counted', () => {
    const t = new TawafTracker()
    t.handleFix({ lat: 21.4225, lng: 39.8262, accuracy: 80, time: t0 })
    expect(t.rejectedAccuracy).toBe(1)
    expect(t.counter.acceptedFixes).toBe(0)
  })
})

describe("Sa'i", () => {
  test('seven trips between Safa and Marwah count 7', () => {
    const s = new SaiTracker()
    expect(SaiTracker.simulatedWalk(t0).reduce((n, f) => n + s.handleFix(f), 0)).toBe(7)
  })
  test('a single Safa to Marwah trip counts (220 m minimum never could)', () => {
    const s = new SaiTracker()
    const walk = SaiTracker.simulatedWalk(t0)
    const leg = walk.slice(0, walk.length / 7)
    expect(leg.reduce((n, f) => n + s.handleFix(f), 0)).toBe(1)
  })
  test('walking half-way and back counts nothing', () => {
    const s = new SaiTracker()
    const half = SaiTracker.simulatedWalk(t0).slice(0, 80)
    const back = [...half].reverse().map((f, i) => ({ ...f, time: t0 + 200_000 + i * 1000 }))
    expect([...half, ...back].reduce((n, f) => n + s.handleFix(f), 0)).toBe(0)
  })
})

describe("Sa'i direction and trip progress", () => {
  it('flips direction at each hill and counts 7 trips', () => {
    const t = new SaiTracker()
    const fixes = SaiTracker.simulatedWalk(0)
    const perLeg = Math.round(fixes.length / 7)
    let trips = 0
    const headings: number[] = []
    fixes.forEach((f, i) => {
      trips += t.handleFix(f)
      if (i % perLeg === Math.floor(perLeg / 2)) headings.push(t.live!.heading)
    })
    expect(trips).toBe(7)
    expect(headings.slice(0, 4)).toEqual([1, -1, 1, -1])
  })

  it('reports trip progress mid-way', () => {
    const t = new SaiTracker()
    const fixes = SaiTracker.simulatedWalk(0)
    const half = Math.round(fixes.length / 14)
    fixes.slice(0, half).forEach((f) => t.handleFix(f))
    expect(t.live!.tripFraction).toBeGreaterThan(0.4)
    expect(t.live!.tripFraction).toBeLessThan(0.6)
  })
})
