import { bearingDeg, destination, distanceMeters, normalizeSignedDeg, type LatLng } from '../../../lib/geo'
import { HolySites } from '../../../lib/holySites'

/**
 * Where Tawaf happens: the centre walked around, and the start point in line
 * with Hajar al-Aswad. Port of tawaf_geometry.dart: lap counting, the guide
 * and the route map all read one geometry so they never disagree.
 */
export class TawafGeometry {
  readonly name: string
  readonly center: LatLng
  readonly start: LatLng

  constructor(name: string, center: LatLng, start: LatLng) {
    this.name = name
    this.center = center
    this.start = start
  }

  static readonly makkah = new TawafGeometry('Masjid al-Haram', HolySites.kaaba, HolySites.hajarAlAswad)

  /** Bearing (0° = north, clockwise) from the centre to the start point. */
  get startBearingDeg(): number {
    return bearingDeg(this.center.lat, this.center.lng, this.start.lat, this.start.lng)
  }

  get startRadiusMeters(): number {
    return distanceMeters(this.center.lat, this.center.lng, this.start.lat, this.start.lng)
  }

  bearingFromCenter(lat: number, lng: number): number {
    return bearingDeg(this.center.lat, this.center.lng, lat, lng)
  }

  distanceFromCenter(lat: number, lng: number): number {
    return distanceMeters(this.center.lat, this.center.lng, lat, lng)
  }

  distanceToStart(lat: number, lng: number): number {
    return distanceMeters(this.start.lat, this.start.lng, lat, lng)
  }

  /** Signed angle (-180..180) from the start line: positive = already past
   * the start in the Tawaf (anticlockwise) direction. */
  angleFromStartLineDeg(lat: number, lng: number): number {
    return -normalizeSignedDeg(this.bearingFromCenter(lat, lng) - this.startBearingDeg)
  }

  pointAt(bearing: number, distanceM: number): LatLng {
    return destination(this.center.lat, this.center.lng, bearing, distanceM)
  }
}
