import L from 'leaflet'
import { Navigation } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Card, Empty, Page, PageHeader } from '../../components/ui'
import { HolySites } from '../../lib/holySites'
import { useAuth } from '../../store/auth'
import { placeKind } from './familyRepo'
import { timeAgo } from './FamilyScreen'
import { useFamily } from './familyStore'

export const OSM = { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors' }

const pin = (html: string) => L.divIcon({ html, className: '', iconSize: [36, 36], iconAnchor: [18, 18] })

const personIcon = (name: string, head: boolean) =>
  pin(
    `<div style="width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-family:Open Sans,sans-serif;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);background:${head ? '#d4af37' : '#059669'};color:${head ? '#064e3b' : 'white'}">${(name.trim()[0] ?? '?').toUpperCase()}</div>`,
  )

const placeIcon = (color: string, emoji: string) =>
  pin(`<div style="width:32px;height:32px;border-radius:10px;display:grid;place-items:center;font-size:16px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);background:${color}">${emoji}</div>`)

function FitAll({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 16)
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 17 })
    // Fit once per set of people, not on every position update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, points.length])
  return null
}

export function FamilyMapScreen() {
  const f = useFamily()
  const me = useAuth((s) => s.user?.id)
  useEffect(() => {
    if (!f.family) f.load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const people = f.members.filter((m) => f.locations[m.userId])
  const points = useMemo(
    () => [...people.map((m) => [f.locations[m.userId].lat, f.locations[m.userId].lng] as [number, number]), ...f.places.map((p) => [p.lat, p.lng] as [number, number])],
    [people, f.locations, f.places],
  )

  return (
    <Page className="max-w-5xl">
      <PageHeader title="Family map" subtitle={f.family?.name} />
      {!f.family ? (
        <Empty title="No family yet">Create or join a family on the Family tab.</Empty>
      ) : (
        <>
          <div className="h-[60dvh] overflow-hidden rounded-2xl border border-line">
            <MapContainer center={[HolySites.kaaba.lat, HolySites.kaaba.lng]} zoom={15} className="size-full">
              <TileLayer url={OSM.url} attribution={OSM.attribution} />
              {people.map((m) => {
                const l = f.locations[m.userId]
                return (
                  <Marker key={m.userId} position={[l.lat, l.lng]} icon={personIcon(m.name, m.role === 'head')}>
                    <Popup>
                      <strong>{m.name}{m.userId === me ? ' (you)' : ''}</strong>
                      <br />
                      Updated {timeAgo(l.timestamp)}
                      {l.accuracy != null && <> · ±{Math.round(l.accuracy)} m</>}
                      <br />
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}`} target="_blank" rel="noreferrer">Directions</a>
                    </Popup>
                  </Marker>
                )
              })}
              {f.places.map((p) => {
                const k = placeKind(p.category)
                const owner = f.members.find((m) => m.userId === p.userId)?.name
                return (
                  <Marker key={p.id} position={[p.lat, p.lng]} icon={placeIcon(k.color, k.emoji)}>
                    <Popup>
                      <strong>{p.label}</strong> · {k.label}
                      {owner && <><br />Saved by {owner}</>}
                      {p.note && <><br />{p.note}</>}
                      <br />
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`} target="_blank" rel="noreferrer">Directions</a>
                    </Popup>
                  </Marker>
                )
              })}
              <FitAll points={points} />
            </MapContainer>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {f.members.map((m) => {
              const l = f.locations[m.userId]
              return (
                <Card key={m.userId} className="w-44 shrink-0 p-3">
                  <p className="truncate font-semibold text-ink">{m.name}</p>
                  <p className="text-xs text-muted">{l ? `Seen ${timeAgo(l.timestamp)}` : m.isLocationSharingEnabled ? 'No recent location' : 'Not sharing'}</p>
                  {l && (
                    <a className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary" href={`https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}`} target="_blank" rel="noreferrer">
                      <Navigation className="size-3" /> Directions
                    </a>
                  )}
                </Card>
              )
            })}
          </div>
          {people.length === 0 && <p className="mt-2 text-center text-sm text-muted">No one is sharing their location right now.</p>}
        </>
      )}
    </Page>
  )
}
