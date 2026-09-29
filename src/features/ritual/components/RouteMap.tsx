import L from 'leaflet'
import { useEffect } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet'
import type { LatLng } from '../../../lib/geo'

// Esri World Imagery: satellite tiles without an API key.
export const SATELLITE = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; Esri',
}

function Follow({ to }: { to: LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    if (to) map.panTo([to.lat, to.lng], { animate: true })
  }, [map, to])
  return null
}

export function RouteMap({
  center,
  start,
  route,
  me,
  zoom = 19,
  height = 240,
  follow = false,
  extraPoints = [],
}: {
  center: LatLng
  start?: LatLng
  route: LatLng[]
  me?: LatLng | null
  zoom?: number
  height?: number
  follow?: boolean
  extraPoints?: { at: LatLng; label: string; color: string }[]
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line" style={{ height }}>
      <MapContainer center={[center.lat, center.lng]} zoom={zoom} maxZoom={20} className="size-full" zoomControl={false} attributionControl>
        <TileLayer url={SATELLITE.url} attribution={SATELLITE.attribution} maxNativeZoom={19} maxZoom={20} />
        {route.length > 1 && <Polyline positions={route.map((p) => [p.lat, p.lng] as L.LatLngTuple)} pathOptions={{ color: '#eab308', weight: 4, opacity: 0.9 }} />}
        {start && <CircleMarker center={[start.lat, start.lng]} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: '#059669', fillOpacity: 1 }} />}
        {extraPoints.map((p) => (
          <CircleMarker key={p.label} center={[p.at.lat, p.at.lng]} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: p.color, fillOpacity: 1 }} />
        ))}
        {me && <CircleMarker center={[me.lat, me.lng]} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }} />}
        {follow && <Follow to={me ?? null} />}
      </MapContainer>
    </div>
  )
}
