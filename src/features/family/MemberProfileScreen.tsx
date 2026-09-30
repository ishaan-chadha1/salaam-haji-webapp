import { ChevronRight, Map, MapPin, MessageSquare, Navigation, UserMinus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Empty, Page, PageHeader, Sheet } from '../../components/ui'
import { useAuth } from '../../store/auth'
import { stageLabel } from '../ritual/ritualStore'
import { placeKind, type SavedPlace } from './familyRepo'
import { Avatar, timeAgo } from './FamilyScreen'
import { OSM, personIcon } from './FamilyMapScreen'
import { useFamily } from './familyStore'

const directionsUrl = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`

/** One family member: status, last position, saved places (view only), ritual
 *  (family_member_detail_screen.dart). */
export function MemberProfileScreen() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const f = useFamily()
  const me = useAuth((s) => s.user?.id)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [place, setPlace] = useState<SavedPlace | null>(null)
  useEffect(() => {
    if (!f.family) f.load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const member = f.members.find((m) => m.userId === userId)
  if (!member) {
    return (
      <Page>
        <PageHeader title="Member" />
        <Empty title={f.status === 'loading' ? 'Loading…' : 'Not in your family'}>
          {f.status === 'loading' ? null : 'This person is no longer a member of your family.'}
        </Empty>
      </Page>
    )
  }

  const isMe = member.userId === me
  const isHead = member.role === 'head'
  const canRemove = f.family?.headId === me && !isMe && !isHead
  const loc = f.locations[member.userId]
  const progress = f.progress[member.userId]
  const places = f.places.filter((p) => p.userId === member.userId)
  const fresh = loc && Date.now() - new Date(loc.timestamp).getTime() < 10 * 60_000
  const status = !member.isLocationSharingEnabled
    ? { text: 'Location sharing off', cls: 'text-muted', dot: 'bg-muted' }
    : !loc
      ? { text: 'No location yet', cls: 'text-amber-400', dot: 'bg-amber-400' }
      : fresh
        ? { text: `Live · ${timeAgo(loc.timestamp)}`, cls: 'text-emerald-400', dot: 'bg-emerald-400' }
        : { text: `Last seen ${timeAgo(loc.timestamp)}`, cls: 'text-amber-400', dot: 'bg-amber-400' }
  const showOnMap = () => navigate(`/family/map?focus=${encodeURIComponent(member.userId)}`)

  return (
    <Page>
      <PageHeader
        title={member.name}
        action={
          <button aria-label="Family messages" onClick={() => navigate('/family/chat')} className="grid size-10 place-items-center rounded-full bg-primary text-on-primary">
            <MessageSquare className="size-5" />
          </button>
        }
      />

      <div className="flex flex-col items-center py-4 text-center">
        <span className="scale-[2.2] py-6"><Avatar name={member.name} head={isHead} /></span>
        <h1 className="mt-2 text-2xl font-bold text-ink">{member.name}</h1>
        <div className="mt-2 flex gap-2">
          {isHead && <span className="rounded-full border border-gold/60 bg-gold/15 px-2.5 py-0.5 text-xs font-bold text-gold">Family Head</span>}
          {isMe && <span className="rounded-full border border-emerald-400/60 bg-emerald-400/15 px-2.5 py-0.5 text-xs font-bold text-emerald-400">You</span>}
        </div>
        <p className={`mt-2 flex items-center gap-1.5 text-sm font-semibold ${status.cls}`}>
          <span className={`size-2 rounded-full ${status.dot}`} /> {status.text}
        </p>
      </div>

      <div className="space-y-3">
        <Card>
          <p className="mb-2 flex items-center gap-2 font-bold text-gold"><MapPin className="size-5" /> Location</p>
          {loc ? (
            <>
              <div className="h-44 overflow-hidden rounded-xl border border-line">
                <MapContainer center={[loc.lat, loc.lng]} zoom={16} className="size-full" zoomControl={false} attributionControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false}>
                  <TileLayer url={OSM.url} />
                  <Marker position={[loc.lat, loc.lng]} icon={personIcon(member.name, isHead)} />
                </MapContainer>
              </div>
              <p className="mt-2 text-sm text-muted">
                Updated {timeAgo(loc.timestamp)}
                {loc.accuracy != null && <> · ±{Math.round(loc.accuracy)} m</>}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">{member.isLocationSharingEnabled ? 'No position received yet.' : `${member.name} is not sharing their location.`}</p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button onClick={showOnMap}><Map className="size-4" /> Show on family map</Button>
            {loc ? (
              <a href={directionsUrl(loc.lat, loc.lng)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-emerald-400 px-5 text-sm font-semibold text-emerald-400">
                <Navigation className="size-4" /> Directions
              </a>
            ) : (
              <span />
            )}
          </div>
        </Card>

        <Card>
          <p className="mb-2 flex items-center justify-between font-bold text-gold">
            <span className="flex items-center gap-2"><MapPin className="size-5" /> Saved places</span>
            {places.length > 0 && <span className="text-sm text-muted">{places.length}</span>}
          </p>
          {places.length === 0 ? (
            <p className="text-sm text-muted">{isMe ? 'You have not saved any places. Add them in Home Finder.' : 'No saved places yet.'}</p>
          ) : (
            <div className="divide-y divide-line">
              {places.map((p) => {
                const k = placeKind(p.category)
                const detail = [p.category?.trim() || k.label, p.note?.trim(), p.address?.trim()].filter(Boolean).join(' · ')
                return (
                  <button key={p.id} onClick={() => setPlace(p)} className="flex w-full items-center gap-3 py-2.5 text-left">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full text-base" style={{ background: k.color }}>{k.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{p.label}</span>
                      <span className="line-clamp-2 block text-xs text-muted">{detail}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted" />
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        <Card>
          <p className="mb-1 font-bold text-gold">Ritual</p>
          {progress?.isActive && progress.stage ? (
            <p className="font-semibold text-emerald-400">
              {stageLabel(progress.stage as 'tawaf' | 'sai')} in progress{progress.updatedAt && <> · since {timeAgo(progress.updatedAt)}</>}
            </p>
          ) : (
            <p className="text-sm text-muted">Not on a ritual right now.</p>
          )}
        </Card>

        {canRemove && (
          <Button variant="secondary" className="w-full text-danger" onClick={() => setConfirmRemove(true)}>
            <UserMinus className="size-4" /> Remove from family
          </Button>
        )}
      </div>

      <Sheet open={place != null} onClose={() => setPlace(null)} title={place?.label ?? ''}>
        {place && (
          <>
            <p className="text-sm text-muted">
              {member.name} · {place.category?.trim() || placeKind(place.category).label}
              {place.note?.trim() && <><br />{place.note}</>}
            </p>
            <div className="mt-4 grid gap-2">
              <a href={directionsUrl(place.lat, place.lng)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary">
                <Navigation className="size-4" /> Walking directions
              </a>
              <Button variant="secondary" onClick={() => navigate(`/family/map?place=${encodeURIComponent(place.id)}`)}>
                <Map className="size-4" /> Show on family map
              </Button>
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={confirmRemove} onClose={() => setConfirmRemove(false)} title={`Remove ${member.name}?`}>
        <p className="text-muted">They will leave the family and stop seeing its members, map and messages.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setConfirmRemove(false)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmRemove(false)
              f.removeMember(member.userId)
              navigate('/family')
            }}
          >
            Remove
          </Button>
        </div>
      </Sheet>
    </Page>
  )
}
