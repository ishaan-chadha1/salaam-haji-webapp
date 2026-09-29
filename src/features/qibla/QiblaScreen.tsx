import { Compass, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, Card, Notice, Page, PageHeader } from '../../components/ui'
import { bearingDeg, distanceMeters, formatDistance } from '../../lib/geo'
import { HolySites } from '../../lib/holySites'
import { useLocation } from '../../store/location'

type OrientationEvt = DeviceOrientationEvent & { webkitCompassHeading?: number }
type PermissionRequester = { requestPermission?: () => Promise<'granted' | 'denied'> }

export function directionText(angle: number): string {
  const dirs = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West']
  return dirs[Math.round(angle / 45) % 8]
}

/** Qibla bearing (qibla_controller.dart) plus a live compass on phones. */
export function QiblaScreen() {
  const { place, status, locate } = useLocation()
  const [heading, setHeading] = useState<number | null>(null)
  const [needsPermission, setNeedsPermission] = useState(false)
  const qibla = bearingDeg(place.lat, place.lng, HolySites.kaaba.lat, HolySites.kaaba.lng)
  const distance = distanceMeters(place.lat, place.lng, HolySites.kaaba.lat, HolySites.kaaba.lng)

  useEffect(() => {
    if (place.isFallback && status === 'idle') locate()
  }, [place.isFallback, status, locate])

  function listen() {
    const onEvt = (e: Event) => {
      const ev = e as OrientationEvt
      if (typeof ev.webkitCompassHeading === 'number') setHeading(ev.webkitCompassHeading)
      else if (ev.absolute && ev.alpha != null) setHeading((360 - ev.alpha) % 360)
    }
    window.addEventListener('deviceorientationabsolute', onEvt)
    window.addEventListener('deviceorientation', onEvt)
    return () => {
      window.removeEventListener('deviceorientationabsolute', onEvt)
      window.removeEventListener('deviceorientation', onEvt)
    }
  }

  useEffect(() => {
    const D = (window as unknown as { DeviceOrientationEvent?: PermissionRequester }).DeviceOrientationEvent
    // iPhone asks for motion permission from a tap.
    if (D?.requestPermission) {
      setNeedsPermission(true)
      return
    }
    return listen()
  }, [])

  const rotation = heading == null ? 0 : -heading
  const aligned = heading != null && Math.abs(((qibla - heading + 540) % 360) - 180) < 5

  return (
    <Page>
      <PageHeader title="Qibla" subtitle={place.label} />
      <Card className="flex flex-col items-center py-6">
        <div className="relative size-72">
          <div className="absolute inset-0 transition-transform duration-200" style={{ transform: `rotate(${rotation}deg)` }}>
            <svg viewBox="0 0 200 200" className="size-full text-ink">
              <circle cx="100" cy="100" r="94" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="2" />
              {Array.from({ length: 72 }, (_, i) => (
                <line key={i} x1="100" y1="8" x2="100" y2={i % 18 === 0 ? 20 : i % 2 === 0 ? 14 : 11} stroke="currentColor" strokeOpacity={i % 18 === 0 ? 0.8 : 0.3} strokeWidth={i % 18 === 0 ? 2 : 1} transform={`rotate(${i * 5} 100 100)`} />
              ))}
              {['N', 'E', 'S', 'W'].map((l, i) => (
                <text key={l} x="100" y="36" textAnchor="middle" fontSize="13" fontWeight="700" fill={l === 'N' ? 'var(--danger)' : 'currentColor'} transform={`rotate(${i * 90} 100 100)`}>
                  {l}
                </text>
              ))}
              <g transform={`rotate(${qibla} 100 100)`}>
                <line x1="100" y1="100" x2="100" y2="66" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round" />
                <rect x="90" y="46" width="20" height="20" rx="2" fill="#111" />
                <rect x="90" y="51" width="20" height="3" fill="#d4af37" />
              </g>
              <circle cx="100" cy="100" r="6" fill="var(--primary)" />
            </svg>
          </div>
          {heading != null && <div className="absolute top-0 left-1/2 h-6 w-1 -translate-x-1/2 rounded bg-primary" />}
        </div>
        <p className="mt-3 text-4xl font-bold text-ink tabular-nums">{Math.round(qibla)}°</p>
        <p className="text-muted">{directionText(qibla)} from true north</p>
        {aligned && <p className="mt-2 rounded-full bg-primary px-3 py-1 text-sm font-semibold text-on-primary">You are facing the Qibla</p>}
      </Card>

      <div className="mt-3 space-y-3">
        {needsPermission && heading == null && (
          <Button
            className="w-full"
            onClick={async () => {
              const D = (window as unknown as { DeviceOrientationEvent?: PermissionRequester }).DeviceOrientationEvent
              if ((await D?.requestPermission?.()) === 'granted') {
                setNeedsPermission(false)
                listen()
              }
            }}
          >
            <Compass className="size-4" /> Enable live compass
          </Button>
        )}
        {heading == null && !needsPermission && (
          <Notice tone="info">No compass on this device. Face {Math.round(qibla)}° clockwise from north — the gold Kaaba on the dial shows the direction on a north-up map.</Notice>
        )}
        <Card className="flex items-center gap-3">
          <MapPin className="size-6 text-primary" />
          <div className="flex-1">
            <p className="font-semibold text-ink">{formatDistance(distance)} to the Kaaba</p>
            <p className="text-sm text-muted">{place.isFallback ? 'Using Makkah — allow location for your own Qibla.' : `From ${place.label}`}</p>
          </div>
          <Button variant="secondary" onClick={locate} loading={status === 'locating'}>Update</Button>
        </Card>
        {status === 'denied' && <Notice tone="warn">Location is blocked. Allow it in the browser's site settings to get your Qibla.</Notice>}
      </div>
    </Page>
  )
}
